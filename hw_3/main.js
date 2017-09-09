"use strict";
const fs = require("fs");

const in_file_name   = process.argv[2] || "input.txt";
const out_file_name  = process.argv[3] || "output.txt";

let a = "0" + "'".repeat(parseInt(fs.readFileSync(in_file_name, "utf-8"))); //Format number: F.e  from 3 to 0''' 

//Proof: @a((a+0')*(a+0')=a*a+(0''*a)+0') 
let tmpl_proof = fs.readFileSync("template.proof", "utf-8").split("\n").map(s => s.replace(/\s+/g, "")).filter(s => s.length > 0);

let proof = [ `|-(${a}+0')*(${a}+0')=(${a}*${a})+(0''*${a})+0'`,
              ...tmpl_proof,//unwrap template_proof
              `@a((a+0')*(a+0')=(a*a)+(0''*a)+0')->((${a}+0')*(${a}+0')=(${a}*${a})+(0''*${a})+0')`,
              `(${a}+0')*(${a}+0')=(${a}*${a})+(0''*${a})+0'`
            ];

fs.writeFileSync(out_file_name, proof.join("\n"), "utf-8");
