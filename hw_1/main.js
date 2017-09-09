/**
 * Created by Fiskov Roman on 10.10.16.
 */

"use strict";

function Node(operation, left, right) {
    this.left = left || "";
    this.right = right || "";
    this.operation = operation || "";
}

Node.prototype.equals = function (other) {
    return typeof(this) === typeof(other) && this.operation === other.operation && this.left.equals(other.left) && this.right.equals(other.right);
};

String.prototype.equals = function (t) {
    return this == t;
};

Node.prototype.toString = function () {
    if (this.operation === "!") {
        if (typeof(this.left) === "string" || this.left.operation === "!") {
            return "!" + this.left.toString();
        }
        return "!(" + this.left.toString() + ")";
    }
    return "(" + this.left.toString() + this.operation + this.right.toString() + ")";
};

function Parser() {
    this.filesystem = require('fs');
    this.resultStr = "";
    this.axiomSchemas = ["a->b->a", "(a->b)->(a->b->c)->(a->c)", "a->b->a&b", "a&b->a", "a&b->b", "a->a|b", "b->a|b",
        "(a->c)->(b->c)->(a|b->x)", "(a->b)->(a->!b)->!a", "!!a->a"].map(function (x) {
        return Parser.prototype.parseExpressionLine(x)
    });
    this.rootsOfExpression = [];
    this.cntHypothesis = 0;
    this.rightP = {};
    this.fullP = {};
}

Parser.prototype.parseExpressionLine = function (line) {
    var tokens = [];
    var operationPriority = {"!": 3, "&": 2, "|": 1, "->": 0};
    var isTypingVar = false;
    var i = 0;
    for (i = 0; i < line.length; i++) {
        if (line[i] in operationPriority || line[i] === "(" || line[i] === ")") {
            tokens.push(line[i]);
            isTypingVar = false;
        } else if (line[i] === "-") {
            tokens.push("->");
            i++;
            isTypingVar = false;
        } else if (/^[а-яА-ЯёЁa-zA-Z0-9]+$/.test(line[i])) {
            if (isTypingVar) {
                tokens[tokens.length - 1] += line[i];
            } else {
                tokens.push(line[i]);
                isTypingVar = true;
            }
        }
    }
    var n = tokens.length;
    i = 0;
    function rec() {
        var stackVar = [];
        var stackOper = [];
        while (i < n) {
            var c = tokens[i];
            if (c === "!") {
                var j = 0;
                while (tokens[i] === "!") {
                    j++;
                    i++;
                }
                var p = tokens[i];
                if (p === "(") {
                    i++;
                    p = rec();
                }
                for (var k = 0; k < j; k++) {
                    p = new Node("!", p);
                }
                stackVar.push(p);
            } else if (c === ")") {
                break;
            } else if (c === "(") {
                i++;
                stackVar.push(rec());
            } else if (c in operationPriority) {
                var last = stackVar.pop();
                while (stackOper.length != 0 && operationPriority[stackOper[stackOper.length - 1]] >= operationPriority[c] && stackOper[stackOper.length - 1] != "->") {
                    last = new Node(stackOper.pop(), stackVar.pop(), last);
                }
                stackVar.push(last);
                stackOper.push(c);
            } else {
                stackVar.push(c);
            }
            i++;
        }
        var root = stackVar.pop();
        while (stackOper.length != 0) {
            root = new Node(stackOper.pop(), stackVar.pop(), root);
        }
        return root;
    }

    return rec();
};

Parser.prototype.isAxiom = function (s) {
    var d = {};

    function axiomChecker(expression, schema) {
        if (typeof(expression) === "string" || schema.operation != expression.operation) {
            return false;
        }
        //Left
        if (typeof(schema.left) == "string") {
            if (!(schema.left in d)) {
                d[schema.left] = expression.left;
            } else if (!d[schema.left].equals(expression.left)) {
                return false;
            }
        } else if (!(axiomChecker(expression.left, schema.left))) {
            return false;
        }
        //Right
        if (schema.operation != "!") {
            if (typeof(schema.right) === "string") {
                if (!(schema.right in d)) {
                    s[schema.right] = expression.right;
                } else {
                    return (d[schema.right].equals(expression.right));
                }
            } else {
                return axiomChecker(expression.right, schema.right);
            }
        }
        return true;
    }

    for (var number = 0; number < this.axiomSchemas.length; number++) {
        d = {};
        if (axiomChecker(s, this.axiomSchemas[number])) {
            return (number + 1);
        }
    }
    return 0;
};

Parser.prototype.parseInputFile = function (inputFileName) {
    var text = this.filesystem.readFileSync(inputFileName, 'utf8');
    var lines = text.split('\n');
    var start = 0;
    if (lines[0].indexOf("|-") != -1) {
        this.resultStr += lines[0] + "\n";
        var h = (lines[0].split("|-"))[0].split(',');
        for (var j = 0; j < h.length; j++) {
            if (h[j] == "") continue;
            this.axiomSchemas.push(this.parseExpressionLine(h[j]));
            this.cntHypothesis++;
        }
        start = 1;
    }
    for (var i = start; i < lines.length; i++) {
        if (lines[i] == "") continue;
        this.rootsOfExpression.push(this.parseExpressionLine(lines[i]));
    }
    return this.rootsOfExpression;
};

Parser.prototype.printResult = function (outputFileName) {
    this.filesystem.writeFileSync(outputFileName, this.resultStr);
};

var main = function () {
    var parser = new Parser();
    var in_file_name  =  process.argv[2] || "input.txt";
    var out_file_name =  process.argv[3] || "output.txt";

    parser.parseInputFile(in_file_name);

    for (var w = 0; w < parser.rootsOfExpression.length; w++) {
        var deduct = parser.rootsOfExpression[w];
        parser.resultStr += "(" + (w + 1) + ")";
        parser.resultStr += " " + deduct.toString() + " ";

        var f = parser.isAxiom(deduct);
        if (f != 0) {
            if (f <= 10) {
                parser.resultStr += "(Сх. акс. " + f + ")\n";
            } else {
                parser.resultStr += "(Предп. " + (f - 10) + ")\n"
            }
        } else if (deduct in parser.rightP) {
            for (var index = 0; index < parser.rightP[deduct].length; index++) {
                var key = parser.rightP[deduct][index];
                if (parser.rootsOfExpression[key].left in parser.fullP) {
                    parser.resultStr += "(M.P. " + (parser.fullP[parser.rootsOfExpression[key].left] + 1) + " " + (key + 1) + ")\n";
                    f = 1;
                    break;
                }
            }
        }

        if (f != 0) {
            parser.fullP[deduct] = w;
            if (typeof(deduct) == "object" && deduct.operation != "!") {
                if (!(deduct.right in parser.rightP)) {
                    parser.rightP[deduct.right] = [];
                }
                parser.rightP[deduct.right].push(w);
            }
        } else {
            parser.resultStr += "(Не доказано)\n";
        }
    }
    parser.printResult(out_file_name);
};

//var time = (new Date()).getTime();
main();
//console.log(((new Date()).getTime() - time));