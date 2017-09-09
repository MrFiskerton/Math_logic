"use strict";
const fs = require("fs");
const ROOT_PROOF_PATH = "./proofs/";

const in_file_name  = process.argv[2]  || "input.txt";
const out_file_name = process.argv[3]  || "output.txt";
const mode          = process.argv[4]  || "deduction";


class Node {
    constructor(key, args) {
        this.key = key;
        this.args = args;
        this.string = this.toString();
    }

    is_increment() { return /^[1-9]/.test(this.key); }
    is_predicate() { return /^[=A-Z]/.test(this.key);}
    is_variable()  { return /^[a-z]/.test(this.key); }
    is_quantifier(){ return /^[?@]/.test(this.key);  }

    has_free(variableName) {
        if (!/^[a-z][0-9]*$/.test(variableName)) {
            throw new Error("Not a variable passed as argument to has_free()");
        } else if (this.args === undefined) {
            return this.string === variableName;
        } else if (this.is_quantifier()) {
            let [variable, expression] = this.args;
            return variable.string !== variableName && expression.has_free(variableName);
        } else {
            return this.args.reduce((accumulator, arg) => accumulator || arg.has_free(variableName), false);
        }
    }

    get_free() {
        if (this.args === undefined) {
            return this.is_variable() ? {[this.string]: true} : {};
        } else if (this.is_quantifier()) {
            let [variable, expression] = this.args, free = expression.get_free();
            delete free[variable.string];
            return free;
        } else {
            return this.args.reduce((accumulator, arg) => Object.assign(accumulator, arg.get_free()), {});
        }
    }

    substitute(map, free = true) {
        if (this.args === undefined) {
            return map.hasOwnProperty(this.key) ? map[this.key] : new Node(this.key);
        } else if (this.is_quantifier()) {
            let [variable, expression] = this.args;
            let newMap = map;
            if (free && map.hasOwnProperty(variable.string)) {
                newMap = Object.assign({}, map);
                delete newMap[variable.string];
            }
            return new Node(this.key, [variable.substitute(free ? {} : map, free), expression.substitute(newMap, free)]);
        } else {
            return new Node(this.key, this.args.map(arg => arg.substitute(map, free)));
        }
    }

    toString() {
        if (this.string !== undefined) return this.string;
        switch (this.key) {
            case "->":
            case "=":
            case "|":
            case "&":
            case "+":
            case "*":
                return this.args.map(arg => `(${arg.string})`).join(this.key);
            case "!":
                return `${this.key}(${this.args[0].string})`;
            case "@":
            case "?":
                return `${this.key}${this.args[0].string}(${this.args[1].string})`;
            case "0":
                return `${this.key}`;
            default:
                if (this.is_increment()) {
                    if (this.args[0].is_increment()) {
                        return `${this.args[0].string}${"'".repeat(parseInt(this.key))}`;
                    }
                    return `(${this.args[0].string})${"'".repeat(parseInt(this.key))}`;
                } else if (this.is_predicate() || this.is_variable()) {
                    let args = this.args === undefined ? "" : `(${this.args.map(a => `(${a.string})`).join()})`;
                    return this.key + args;
                } else {
                    throw new Error(`Failed to run toString() on '${this.key}'`);
                }
        }
    }
}

class Parser {
    constructor(expression) {
        this.expression = expression.replace(/\s+/g, "");
        this.position = 0;
    }

    parse_binary(operator, first, next) {
        if (this.position >= this.expression.length) {
            throw new Error(`Error while parsing '${operator}': ${this.toString()}`);
        }
        let result = first.call(this);
        while (this.expression.startsWith(operator, this.position)) {
            this.position += operator.length;
            result = new Node(operator, [result, next.call(this)]);
        }
        return result;
    }

    parse_expression() { return this.parse_binary("->", this.parse_disjunction, this.parse_expression);}
    parse_disjunction(){ return this.parse_binary("|", this.parse_conjunction, this.parse_conjunction);}
    parse_conjunction(){ return this.parse_binary("&", this.parse_unary, this.parse_unary);}

    parse_unary() {
        if (this.expression.startsWith("!", this.position)) {
            this.position++;
            return new Node("!", [this.parse_unary()]);
        } else if (this.expression.startsWith("(", this.position)) {
            let i = this.position + 1, balance = 1;
            for (; balance !== 0 && i < this.expression.length; ++i) {
                if (this.expression[i] === "(") balance++;
                if (this.expression[i] === ")") balance--;
            }
            if (i < this.expression.length && /^[=+*'’]/.test(this.expression[i])) {
                return this.parse_predicate();
            }

            this.position++;
            let expr = this.parse_expression();
            if (this.expression.startsWith(")", this.position)) {
                this.position++;
                return expr;
            } else {
                throw new Error(`Parentheses not closed: ${this.toString()}`);
            }
        } else if (/^[@?]/.test(this.expression[this.position])) {
            let char = this.expression[this.position++];
            let args = [this.parse_variable()];
            args.push(this.parse_unary());
            return new Node(char, args);
        } else {
            return this.parse_predicate();
        }
    }

    parse_variable() {
        let name = "";
        if (/^[a-z]/.test(this.expression[this.position])) {
            do {
                name += this.expression[this.position++];
            } while (/^[0-9]/.test(this.expression[this.position]));
        } else {
            throw new Error(`Error while parsing variable: ${this.toString()}`);
        }
        return new Node(name);
    }

    parse_predicate() {
        let name = "";
        if (/^[A-Z]/.test(this.expression[this.position])) {
            do {
                name += this.expression[this.position++];
            } while (/^[0-9]/.test(this.expression[this.position]));
            if (this.expression[this.position] === "(") {
                let args = [];
                do {
                    this.position++;
                    args.push(this.parse_add());
                } while (this.expression[this.position] === ",");
                if (this.expression[this.position] === ")") {
                    this.position++;
                    return new Node(name, args);
                } else {
                    throw new Error(`Parentheses not closed: ${this.toString()}`);
                }
            } else {
                return new Node(name);
            }
        } else {
            let args = [this.parse_add()];
            if (this.expression[this.position] !== "=") throw new Error(`Equals sign expected: ${this.toString()}`);
            this.position++;
            args.push(this.parse_add());
            return new Node("=", args);
        }
    }

    parse_add()      {return this.parse_binary("+", this.parse_multiply, this.parse_multiply);}
    parse_multiply() {return this.parse_binary("*", this.parse_inc, this.parse_inc);}

    parse_inc() {
        let term = this.parse_term(), counter = 0;
        while (/^[’']/.test(this.expression[this.position])) {
            this.position++;
            counter++;
        }
        return counter === 0 ? term : new Node("" + counter, [term]);
    }

    parse_term() {
        let name = "";
        if (/^[a-z]/.test(this.expression[this.position])) {
            do {
                name += this.expression[this.position++];
            } while (/^[0-9]/.test(this.expression[this.position]));
            if (this.expression[this.position] === "(") {
                let args = [];
                do {
                    this.position++;
                    args.push(this.parse_add());
                } while (this.expression[this.position] === ",");
                if (this.expression[this.position] === ")") {
                    this.position++;
                    return new Node(name, args);
                } else {
                    throw new Error(`Parentheses not closed: ${this.toString()}`);
                }
            } else {
                return new Node(name);
            }
        } else if (this.expression[this.position] === "(") {
            this.position++;
            let expr = this.parse_add();
            if (this.expression[this.position] === ")") {
                this.position++;
                return expr;
            } else {
                throw new Error(`Parentheses not closed: ${this.toString()}`);
            }
        } else if (this.expression[this.position] === "0") {
            this.position++;
            return new Node("0");
        } else {
            throw new Error(`Tried to parse something strange: ${this.toString()}`);
        }
    }

    toString() {
        return `${this.expression.substring(0, this.position)} 
        >>>${this.expression[this.position]}<<< 
        ${this.expression.substring(this.position + 1)}`;
    }
}

class Checker {
    constructor(hypothesesData, expressionsData, resultData) {
        this.hypothesesData = [];
        let buffer = "", count = 0;
        for (let i = 0; i < hypothesesData.length; ++i) {
            if (hypothesesData.charAt(i) === "(") count++;
            if (hypothesesData.charAt(i) === ")") count--;
            if (count === 0 && hypothesesData.charAt(i) === ",") {
                this.hypothesesData.push(buffer);
                buffer = "";
            } else {
                buffer += hypothesesData.charAt(i);
            }
            if (i === hypothesesData.length - 1 && buffer.length > 0) this.hypothesesData.push(buffer);
        }
        this.expressionsData = expressionsData;
        this.resultData = resultData;

        this.hypotheses = this.hypothesesData.map(e => new Parser(e).parse_expression());
        this.result = new Parser(resultData).parse_expression();

        this.hypothesesIndex = {};
        for (let i = 0; i < this.hypotheses.length; ++i) {
            this.hypothesesIndex[this.hypotheses[i].string] = i;
        }
    }

    check_proof() {
        this.MP = {};
        this.expressions = [];
        this.expressionsIndex = {};
        let proof = [this.hypothesesData.join() + "|-" + this.resultData], failed = 0;
        for (let i = 0; i < this.expressionsData.length; i++) {
            let result = `Не доказано`;
            try {
                result = this.check_expression(i, false);
            } catch (error) {
                failed++;
                console.log(`Ошибка в доказательстве формулы номер ${i + 1}: ${error.message}`);
            }
            proof.push(`(${i + 1}) ${this.expressions[i].string} (${result})`);
        }
        if (failed > 0) {
            console.log(`Не доказано: ${failed}`);
        } else if (this.expressions[this.expressions.length - 1].string !== this.result.string) {
            console.log(`Доказано не то, что требовалось`);
        }
        return proof;
    }

    simplify_proof() {
        this.MP = {};
        this.expressions = [];
        this.expressionsIndex = {};
        let usedExpressions = {}, usedHypotheses = {}, results = [];
        for (let i = 0; i < this.expressionsData.length; i++) {
            let result = `Не доказано`;
            try {
                result = this.check_expression(i, false);
            } catch (error) {
                console.log(`Ошибка в доказательстве формулы номер ${i + 1}: ${error.message}`);
            }
            results.push(result);
        }

        let needed = [], queue = [];
        for (let i = 0; i < results.length; i++) {
            needed.push(false);
        }
        queue.push(this.expressionsData.length - 1);
        while (queue.length > 0) {
            let head = queue.shift();
            needed[head] = true;
            if (results[head].startsWith("Пр. вывода")) {
                let num = results[head].substring("Пр. вывода # из ".length)
            } else if (results[i].startsWith("M.P. ")) {
                let mp2 = results[i].substring("M.P. ".length).split(", ")[1];
            } else if (results[i].startsWith("Предп. ")) {

            } else if (results[i].startsWith("Сх. акс.")) {

            } else {
                throw new Error("Ошибка при выводе дедукции");
            }
        }
        return proof;
    }

    deduce_proof() {
        this.MP = {};
        this.expressions = [];
        this.expressionsIndex = {};
        let size = this.hypothesesData.length,
            result = size === 0 ? this.resultData : `(${this.hypothesesData[size - 1]})->(${this.resultData})`,
            proof = [this.hypothesesData.slice(0, -1).join() + "|-" + result];

        for (let i = 0; i < this.expressionsData.length; i++) {
            let result = `Не доказано`;
            try {
                result = this.check_expression(i, true);
            } catch (error) {
                proof = [`Вывод некорректен начиная с формулы номер ${i + 1}: ${error.message}`];
                break;
            }
            if (size === 0) {
                proof.push(this.expressionsData[i]);
            } else {
                let deduction = this.get_deduction(this.hypotheses[size - 1], this.expressions[i], result);
                proof = proof.concat(deduction);
            }
        }
        return proof;
    }

    get_deduction(hypothesis, expression, result) {
        if (result.startsWith("Пр. вывода @")) {
            let [left, right] = expression.args;
            let [variable, expr] = right.args;
            return Checker.anyDeduction.map(e => e.substitute({"H": hypothesis, "A": left, "B": expr, "x": variable}, false).string);
        } else if (result.startsWith("Пр. вывода ?")) {
            let [left, right] = expression.args;
            let [variable, expr] = left.args;
            return Checker.existsDeduction.map(e => e.substitute({"H": hypothesis, "A": expr, "B": right, "x": variable}, false).string);
        } else if (result.startsWith("M.P. ")) {
            let mp2 = result.substring("M.P. ".length).split(", ")[1];
            let [left, right] = this.expressions[Number(mp2) - 1].args;
            return Checker.modusPonensDeduction.map(e => e.substitute({"H": hypothesis, "A": left, "B": right}).string);
        } else if (result.startsWith("Предп. " + this.hypothesesData.length)) {
            return Checker.selfDeduction.map(e => e.substitute({"H": hypothesis}).string);
        } else if (result.startsWith("Предп. ") || result.startsWith("Сх. акс.")) {
            return Checker.axiomDeduction.map(e => e.substitute({"H": hypothesis, "A": expression}).string);
        } else {
            throw new Error("Ошибка при выводе дедукции");
        }
    }


    check_expression(index, checkDeduction = false) {
        this.expressions.push(new Parser(this.expressionsData[index]).parse_expression());
        let expression = this.expressions[index], errorText = `Не доказано`;
        if (this.expressionsIndex[expression.string] === undefined) {
            this.expressionsIndex[expression.string] = index;
        }
        if (expression.key === "->") {
            let [leftArg, rightArg] = expression.args.map(e => e.string);
            if (this.MP[rightArg] === undefined) {
                this.MP[rightArg] = [];
            }
            this.MP[rightArg].push({full: index, left: leftArg});
            [leftArg, rightArg] = expression.args;

            let quantification = this.check_quantification(leftArg, rightArg, checkDeduction);
            if (quantification.number !== undefined) {
                if (!quantification.error) {
                    return `Пр. вывода ${quantification.quantifier} из ${quantification.number + 1}`;
                } else if (quantification.hypothesisUsed) {
                    errorText = `используется правило с квантором по переменной ${quantification.variable}, входящей свободно в допущение ${this.hypotheses[this.hypotheses.length - 1].string}`;
                } else {
                    errorText = `переменная ${quantification.variable} входит свободно в формулу ${quantification.number + 1}`;
                }
            }

            let quantificationAxioms = this.check_quantification_axioms(leftArg, rightArg);
            if (quantificationAxioms.axiom !== undefined) {
                if (!quantificationAxioms.error) {
                    return `Сх. акс. A${quantificationAxioms.axiom + 1}`;
                } else {
                    errorText = `терм ${quantificationAxioms.term} не свободен для подстановки в формулу ${quantificationAxioms.formula} вместо переменной ${quantificationAxioms.variable}`;
                }
            }

            let induction = this.check_induction(leftArg, rightArg);
            if (induction.variable !== undefined) { return `Сх. акс. A9`;}
        }

        let [mp1, mp2] = this.check_ModusPonens(index);
        if (mp1 !== mp2) { return `M.P. ${mp1 + 1}, ${mp2 + 1}`;}

        for (let i = 0, array = Checker.logicAxioms; i < array.length; i++) {
            if (this.compare_trees(expression, array[i])) { return `Сх. акс. ${i + 1}`;}
        }

        for (let i = 0, array = Checker.mathAxioms; i < array.length; i++) {
            if (this.compare_trees(expression, array[i])) { return `Сх. акс. A${i + 1}`;}
        }

        for (let i = 0, array = this.hypotheses; i < array.length; i++) {
            if (expression.string === array[i].string)    { return `Предп. ${i + 1}`;}
        }

        throw new Error(errorText);
    }

    check_ModusPonens(index) {
        // A, A->B => B
        let expression = this.expressions[index], modusPonens = this.MP[expression.string];
        if (modusPonens !== undefined) {
            for (let i = 0; i < modusPonens.length; i++) {
                let leftIndex = this.expressionsIndex[modusPonens[i].left];
                if (leftIndex !== undefined && leftIndex !== index) {
                    return [leftIndex, modusPonens[i].full];
                }
            }
        }
        return [-1, -1];
    }

    check_quantification(left, right, checkDeduction = false) {
        // If there is no free 'x' in 'A'
        // B->A => ∃xB->A
        // A->B => A->∀xB
        let result = {
            error: false,
            hypothesisUsed: false,
            quantifier: "?",
            number: undefined,
            variable: ""
        };
        if (left.key === "?") {
            let [variable, expression] = left.args;
            result.variable = variable.string;
            let exprString = new Node("->", [expression, right]).string;
            let index = this.expressionsIndex[exprString];
            if (index !== undefined) {
                result.number = index;
                result.error = right.has_free(result.variable);
                return result;
            }
        }
        if (right.key === "@") {
            let hypothesisFree = this.hypotheses.length > 0 ? this.hypotheses[this.hypotheses.length - 1].get_free() : {};
            result.quantifier = "@";
            let [variable, expression] = right.args;
            result.variable = variable.string;
            let exprString = new Node("->", [left, expression]).string;
            let index = this.expressionsIndex[exprString];
            if (index !== undefined) {
                result.number = index;
                result.hypothesisUsed = checkDeduction && hypothesisFree[variable.string];
                result.error = result.hypothesisUsed || left.has_free(result.variable);
                return result;
            }
        }
        return result;
    }

    check_quantification_axioms(left, right) {
        // Пусть θ свободно для подстановки вместо x в A.
        // (11) ∀xA->A[x := θ]
        // (12) A[x := θ]->∃xA
        
        let result = {
            error: true,
            term: undefined,
            formula: undefined,
            variable: undefined,
            axiom: undefined
        };
        if (left.key === "@") {
            let [variable, expression] = left.args, variables = {};

            if (this.compare_trees(right, expression, variables)) {
                result.error = false;
                for (let key in variables) {
                    if (key !== variable.string && key === variables[key].string) continue;
                    if (key !== variable.string) return {};
                    if (!this.compare_trees(right, expression, variables, {}, variable.string)) { // Если не свободно для подстановки
                        result.term = variables[key].string;
                        result.formula = expression.string;
                        result.error = true;
                    }
                }
                result.axiom = 10;
                result.variable = variable.string;
            }
        }
        if (right.key === "?" && result.error) {
            let [variable, expression] = right.args, variables = {};
            if (this.compare_trees(left, expression, variables)) {
                result.error = false;
                for (let key in variables) {
                    if (key !== variable.string && key === variables[key].string) continue;
                    if (key !== variable.string) return {};
                    if (!this.compare_trees(left, expression, variables, {}, variable.string)) { // Если не свободно для подстановки
                        result.term = variables[key].string;
                        result.formula = expression.string;
                        result.error = true;
                    }
                }
                result.axiom = 11;
                result.variable = variable.string;
            }
        }
        return result;
    }

    check_induction(leftArg, rightArg) {
        // (A9) A[x := 0] & ∀x(A->A[x := x'])->A
        // x — некоторая переменная, входящая свободно в A
        if (leftArg.key !== "&") { return {}; }

        let [andLeft, andRight] = leftArg.args;
        if (andRight.key !== "@") { return {}; }

        let [variable, implication] = andRight.args;
        if (implication.key !== "->" || implication.args[0].string !== rightArg.string || !rightArg.has_free(variable.string)) {
            return {};
        }

        let variables = {}, result = true;
        if (!this.compare_trees(andLeft, rightArg, variables)) { return {}; }
        for (let key in variables) {
            if (key === variables[key].string) continue;
            if (key !== variable.string) return {};
            result = result && (variables[key].string === "0");
        }
        if (!result) { return {};}

        let variables2 = {};
        if (!this.compare_trees(implication.args[1], rightArg, variables2)) { return {}; }

        for (let key in variables2) {
            if (key === variables2[key].string) continue;
            if (key !== variable.string) return {};
            result = result && (variables2[key].string === `(${variable.string})'`);
        }
        if (!result) { return {}; }

        return { variable: variable.string };
    }

    compare_trees(expression, axiom, variables = {}, boundVariables = {}, fixedVariable) {
        if (expression === undefined || axiom === undefined) { return false;}
        if (axiom.args === undefined) { // Axiom variable or predicate without arguments
            if (axiom.string === "0") {
                return expression.string === "0";
            } else if (boundVariables.hasOwnProperty(axiom.string)) {
                return boundVariables[axiom.string].string === expression.string;
            } else if (variables.hasOwnProperty(axiom.string)) {
                if (fixedVariable !== undefined && axiom.string === fixedVariable) {
                    let free = expression.get_free();
                    for (let key in boundVariables) {
                        if (free[key]) return false;
                    }
                }
                return variables[axiom.string].string === expression.string;
            } else {
                variables[axiom.string] = expression;
                if (fixedVariable !== undefined && axiom.string === fixedVariable) {
                    let free = expression.get_free();
                    for (let key in boundVariables) {
                        if (free[key]) return false;
                    }
                }
                return true;
            }
        } else if (axiom.key === expression.key && axiom.args.length === expression.args.length) { // Axiom operator
            if (axiom.is_quantifier()) {
                let [axiomVar, axiomExpr] = axiom.args, [exprVar, exprExpr] = expression.args;
                let newBoundVariables = Object.assign({}, boundVariables, {[axiomVar.string]: exprVar});
                return this.compare_trees(exprExpr, axiomExpr, variables, newBoundVariables, fixedVariable);
            } else {
                return axiom.args.reduce((accumulator, element, i) => accumulator && this.compare_trees(expression.args[i], element, variables, boundVariables, fixedVariable), true);
            }
        } else if (axiom.is_increment() && expression.is_increment() && Number(axiom.key) < Number(expression.key)) {
            let diff = (Number(expression.key) - Number(axiom.key)).toString();
            return this.compare_trees(new Node(diff, [expression.args[0]]), axiom.args[0], variables, boundVariables, fixedVariable);
        }
        return false;
    }
}

Checker.logicAxioms = [
    "A->B->A",                    // 1
    "(A->B)->(A->B->C)->(A->C)",  // 2
    "A->B->A&B",                  // 3
    "A&B->A",                     // 4
    "A&B->B",                     // 5
    "A->A|B",                     // 6
    "B->A|B",                     // 7
    "(A->C)->(B->C)->(A|B->C)",   // 8
    "(A->B)->(A->!B)->!A",        // 9
    "!!A->A"                      // 10
].map(e => new Parser(e).parse_expression());

Checker.mathAxioms = [
    "a=b->a'=b'",                 // A1
    "(a=b)->(a=c)->(b=c)",        // A2
    "a'=b'->a=b",                 // A3
    "!a'=0",                      // A4
    "a+b'=(a+b)'",                // A5
    "a+0=a",                      // A6
    "a*0=0",                      // A7
    "a*b'=a*b+a"                  // A8
].map(e => new Parser(e).parse_expression());

var main = function() {
	const readLines  = (file_name) => fs.readFileSync(file_name, "utf-8").split("\n").map(s => s.replace(/\s+/g, "")).filter(s => s.length > 0);
    const writeLines = (file_name, data) => fs.writeFileSync(file_name, data.join("\n"), "utf-8");

	Checker.anyDeduction         = readLines(ROOT_PROOF_PATH + "any.proof").map(e => new Parser(e).parse_expression());
	Checker.existsDeduction      = readLines(ROOT_PROOF_PATH + "exists.proof").map(e => new Parser(e).parse_expression());
	Checker.selfDeduction        = readLines(ROOT_PROOF_PATH + "self.proof").map(e => new Parser(e).parse_expression());
	Checker.modusPonensDeduction = readLines(ROOT_PROOF_PATH + "modusponens.proof").map(e => new Parser(e).parse_expression());
	Checker.axiomDeduction       = readLines(ROOT_PROOF_PATH + "axiom.proof").map(e => new Parser(e).parse_expression());

	let data = readLines(in_file_name), [hypotheses, result] = data.shift().split("|-");
    let checker = new Checker(hypotheses, data, result);

	writeLines(out_file_name, mode === "check" ? checker.check_proof() : checker.deduce_proof());
}

const processing_time = "Processing time";
console.time(processing_time);

main();

console.timeEnd(processing_time);