require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const helmet = require("helmet");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error("Set JWT_SECRET to a random secret of at least 32 characters.");
  process.exit(1);
}
const dbFile = process.env.DATABASE_FILE || "./data/app.db";
if (dbFile !== ":memory:") fs.mkdirSync(path.dirname(path.resolve(dbFile)), { recursive: true });
const db = new Database(dbFile);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
 email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS tasks (
 id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 name TEXT NOT NULL, description TEXT DEFAULT '', priority TEXT NOT NULL DEFAULT 'Normal',
 due_date TEXT DEFAULT '', done INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders (
 id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 order_code TEXT NOT NULL UNIQUE, items_json TEXT NOT NULL, total INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'Demo order', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS posts (
 id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title TEXT NOT NULL, body TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'Development',
 tags_json TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'draft',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);
const products = [
 {id:1,name:"Wireless Headphones",category:"Tech",price:2499,emoji:"🎧",description:"Comfortable everyday audio.",stock:25},
 {id:2,name:"Desk Lamp",category:"Workspace",price:1199,emoji:"💡",description:"Adjustable light for focused work.",stock:18},
 {id:3,name:"Mechanical Keyboard",category:"Tech",price:3299,emoji:"⌨️",description:"Tactile typing for your setup.",stock:12},
 {id:4,name:"Travel Tumbler",category:"Lifestyle",price:599,emoji:"🥤",description:"A reusable companion for busy days.",stock:40},
 {id:5,name:"Notebook",category:"Workspace",price:299,emoji:"📓",description:"A clean space for ideas.",stock:60},
 {id:6,name:"Laptop Stand",category:"Tech",price:1499,emoji:"💻",description:"Raise your screen and improve desk comfort.",stock:16},
 {id:7,name:"Wireless Mouse",category:"Tech",price:1499,emoji:"🖱️",description:"A comfortable everyday mouse.",stock:22},
 {id:8,name:"Desk Organizer",category:"Workspace",price:749,emoji:"🗂️",description:"Keep essentials neatly within reach.",stock:30},
 {id:9,name:"Sling Bag",category:"Accessories",price:1799,emoji:"🎒",description:"A compact carry option for daily essentials.",stock:14}
];
app.use(helmet({contentSecurityPolicy:false}));
app.use(express.json({limit:"1mb"}));
// Keep server configuration, source, dependencies and the SQLite database off the public web root.
app.use((req,res,next)=>{
 const blocked=["/server.js","/package.json","/README.md","/render.yaml","/.env","/data","/node_modules","/server","/.git"];
 if(blocked.some(p=>req.path===p||req.path.startsWith(p+"/"))) return res.status(404).send("Not found");
 next();
});
app.use(express.static(path.join(__dirname)));
const emailOk = v => typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;
function auth(req,res,next){
 const h=req.headers.authorization||"";
 if(!h.startsWith("Bearer ")) return res.status(401).json({error:"Please sign in to continue."});
 try { const p=jwt.verify(h.slice(7),JWT_SECRET); req.user={id:p.sub,name:p.name,email:p.email}; next(); }
 catch { return res.status(401).json({error:"Your session expired. Please sign in again."}); }
}
function tokenFor(user){return jwt.sign({sub:user.id,name:user.name,email:user.email},JWT_SECRET,{expiresIn:"7d"});}
app.get("/api/health",(req,res)=>res.json({ok:true,service:"Umang Portfolio API",database:"connected"}));
app.post("/api/auth/register",async(req,res)=>{
 const name=String(req.body.name||"").trim(),email=String(req.body.email||"").trim().toLowerCase(),password=String(req.body.password||"");
 if(name.length<2||name.length>70) return res.status(400).json({error:"Name must be 2–70 characters."});
 if(!emailOk(email)) return res.status(400).json({error:"Enter a valid email address."});
 if(password.length<8||password.length>100) return res.status(400).json({error:"Password must be at least 8 characters."});
 try {
  const hash=await bcrypt.hash(password,12);
  const info=db.prepare("INSERT INTO users(name,email,password_hash) VALUES(?,?,?)").run(name,email,hash);
  const user={id:Number(info.lastInsertRowid),name,email};
  res.status(201).json({token:tokenFor(user),user});
 } catch(e){ if(String(e).includes("UNIQUE")) return res.status(409).json({error:"An account with this email already exists."}); throw e; }
});
app.post("/api/auth/login",async(req,res)=>{
 const email=String(req.body.email||"").trim().toLowerCase(),password=String(req.body.password||"");
 const row=db.prepare("SELECT * FROM users WHERE email=?").get(email);
 if(!row||!(await bcrypt.compare(password,row.password_hash))) return res.status(401).json({error:"Email or password is incorrect."});
 const user={id:row.id,name:row.name,email:row.email};
 res.json({token:tokenFor(user),user});
});
app.get("/api/auth/me",auth,(req,res)=>res.json({user:req.user}));

// TaskFlow: all records are scoped to the signed-in account.
app.get("/api/tasks",auth,(req,res)=>res.json(db.prepare("SELECT id,name,description AS description,priority,due_date AS dueDate,done,created_at AS createdAt FROM tasks WHERE user_id=? ORDER BY id DESC").all(req.user.id).map(t=>({...t,done:!!t.done}))));
app.post("/api/tasks",auth,(req,res)=>{
 const name=String(req.body.name||"").trim(),description=String(req.body.description||"").trim(),priority=req.body.priority||"Normal",dueDate=String(req.body.dueDate||"");
 if(!name||name.length>120||description.length>1000) return res.status(400).json({error:"Task name (1–120 chars) and description (max 1000 chars) are required."});
 if(!["Low","Normal","High"].includes(priority)) return res.status(400).json({error:"Invalid priority."});
 const info=db.prepare("INSERT INTO tasks(user_id,name,description,priority,due_date) VALUES(?,?,?,?,?)").run(req.user.id,name,description,priority,dueDate);
 res.status(201).json({id:Number(info.lastInsertRowid),name,description,priority,dueDate,done:false});
});
app.patch("/api/tasks/:id",auth,(req,res)=>{
 const id=Number(req.params.id),old=db.prepare("SELECT * FROM tasks WHERE id=? AND user_id=?").get(id,req.user.id);
 if(!old) return res.status(404).json({error:"Task not found."});
 const name=req.body.name===undefined?old.name:String(req.body.name).trim();
 const description=req.body.description===undefined?old.description:String(req.body.description).trim();
 const priority=req.body.priority===undefined?old.priority:req.body.priority;
 const dueDate=req.body.dueDate===undefined?old.due_date:String(req.body.dueDate);
 const done=req.body.done===undefined?old.done:(req.body.done?1:0);
 if(!name||name.length>120||description.length>1000||!["Low","Normal","High"].includes(priority)) return res.status(400).json({error:"Invalid task details."});
 db.prepare("UPDATE tasks SET name=?,description=?,priority=?,due_date=?,done=? WHERE id=? AND user_id=?").run(name,description,priority,dueDate,done,id,req.user.id);
 res.json({id,name,description,priority,dueDate,done:!!done});
});
app.delete("/api/tasks/:id",auth,(req,res)=>{const r=db.prepare("DELETE FROM tasks WHERE id=? AND user_id=?").run(Number(req.params.id),req.user.id);if(!r.changes)return res.status(404).json({error:"Task not found."});res.json({ok:true});});

// ShopEase: products are public; order history and checkout require authentication.
app.get("/api/products",(req,res)=>res.json(products));
app.post("/api/orders",auth,(req,res)=>{
 const items=Array.isArray(req.body.items)?req.body.items:[];
 if(!items.length||items.length>30)return res.status(400).json({error:"Your cart is empty or too large."});
 let total=0,clean=[];
 for(const item of items){
  const p=products.find(x=>x.id===Number(item.productId)),qty=Number(item.quantity);
  if(!p||!Number.isInteger(qty)||qty<1||qty>20)return res.status(400).json({error:"Invalid cart item."});
  total+=p.price*qty;clean.push({productId:p.id,name:p.name,price:p.price,quantity:qty});
 }
 const code="SE-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,5).toUpperCase();
 db.prepare("INSERT INTO orders(user_id,order_code,items_json,total) VALUES(?,?,?,?)").run(req.user.id,code,JSON.stringify(clean),total);
 res.status(201).json({orderCode:code,total,status:"Demo order placed. No payment was collected."});
});
app.get("/api/orders",auth,(req,res)=>res.json(db.prepare("SELECT order_code AS orderCode,items_json AS items,total,status,created_at AS createdAt FROM orders WHERE user_id=? ORDER BY id DESC").all(req.user.id).map(o=>({...o,items:JSON.parse(o.items)}))));

// DevSpace: draft/published content belongs to its author.
app.get("/api/posts",auth,(req,res)=>{
 const status=req.query.status;
 const rows=status==="draft"||status==="published"?db.prepare("SELECT * FROM posts WHERE user_id=? AND status=? ORDER BY updated_at DESC").all(req.user.id,status):db.prepare("SELECT * FROM posts WHERE user_id=? ORDER BY updated_at DESC").all(req.user.id);
 res.json(rows.map(p=>({id:p.id,title:p.title,body:p.body,category:p.category,tags:JSON.parse(p.tags_json),status:p.status,createdAt:p.created_at,updatedAt:p.updated_at})));
});
app.post("/api/posts",auth,(req,res)=>{
 const title=String(req.body.title||"").trim(),body=String(req.body.body||"").trim(),category=String(req.body.category||"Development").slice(0,50),tags=Array.isArray(req.body.tags)?req.body.tags.slice(0,8).map(x=>String(x).slice(0,30)):[],status=req.body.status==="published"?"published":"draft";
 if(!title||title.length>140||!body||body.length>20000)return res.status(400).json({error:"Title (1–140 chars) and content (max 20,000 chars) are required."});
 const info=db.prepare("INSERT INTO posts(user_id,title,body,category,tags_json,status) VALUES(?,?,?,?,?,?)").run(req.user.id,title,body,category,JSON.stringify(tags),status);
 res.status(201).json({id:Number(info.lastInsertRowid),title,body,category,tags,status});
});
app.patch("/api/posts/:id",auth,(req,res)=>{
 const id=Number(req.params.id),old=db.prepare("SELECT * FROM posts WHERE id=? AND user_id=?").get(id,req.user.id);
 if(!old)return res.status(404).json({error:"Post not found."});
 const title=req.body.title===undefined?old.title:String(req.body.title).trim(),body=req.body.body===undefined?old.body:String(req.body.body).trim();
 const category=req.body.category===undefined?old.category:String(req.body.category).slice(0,50);
 const tags=req.body.tags===undefined?JSON.parse(old.tags_json):(Array.isArray(req.body.tags)?req.body.tags.slice(0,8).map(x=>String(x).slice(0,30)):[]);
 const status=req.body.status===undefined?old.status:(req.body.status==="published"?"published":"draft");
 if(!title||title.length>140||!body||body.length>20000)return res.status(400).json({error:"Invalid post details."});
 db.prepare("UPDATE posts SET title=?,body=?,category=?,tags_json=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?").run(title,body,category,JSON.stringify(tags),status,id,req.user.id);
 res.json({id,title,body,category,tags,status});
});
app.delete("/api/posts/:id",auth,(req,res)=>{const r=db.prepare("DELETE FROM posts WHERE id=? AND user_id=?").run(Number(req.params.id),req.user.id);if(!r.changes)return res.status(404).json({error:"Post not found."});res.json({ok:true});});

app.use("/api",(req,res)=>res.status(404).json({error:"API route not found."}));
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"index.html")));
app.listen(PORT,()=>console.log(`Portfolio running at http://localhost:${PORT}`));
