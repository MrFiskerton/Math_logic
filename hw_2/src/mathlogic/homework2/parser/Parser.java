package mathlogic.homework2.parser;

import mathlogic.homework2.expressions.*;
import mathlogic.homework2.expressions.Operations.*;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Stack;

import static java.lang.Character.*;
import static mathlogic.homework2.expressions.Operations.OperationTypes.*;


public class Parser {

    private Tokenizer tokenizer;

    public Expression parse(String str) {
        this.tokenizer = new Tokenizer(str);
        return fetchImplication();
    }

    private static class Tokenizer {
        private String str;
        private int index;

        public String prevConst = "", prevPredicate = "", prevVariable = "";
        private OperationTypes tokenType;

        public Tokenizer(String expression) {
            this.str = expression;
            this.index = 0;
            parseNext();
        }

        public void parseNext() {
            if (index >= str.length()) {
                tokenType = END;
                return;
            }

            char cur = str.charAt(index);
            while (index < str.length() && isWhitespace(str.charAt(index))) {
                index++;
                if (index < str.length()) cur = str.charAt(index);
            }

            switch (cur) {
                case '+': {
                    tokenType = ADD;
                    index++;
                    return;
                }
                case '&': {
                    tokenType = AND;
                    index++;
                    return;
                }
                case '@': {
                    tokenType = ANY;
                    index++;
                    return;
                }
                case ')': {
                    tokenType = CLOSE;
                    index++;
                    return;
                }
                case ',': {
                    tokenType = COMMA;
                    index++;
                    return;
                }
                case '=': {
                    tokenType = EQUAL;
                    index++;
                    return;
                }
                case '?': {
                    tokenType = EXIST;
                    index++;
                    return;
                }
                case '-': {
                    tokenType = IMPLICATION;
                    index += 2;
                    return;
                }
                case '\'': {
                    tokenType = INCREMENT;
                    index++;
                    return;
                }
                case '*': {
                    tokenType = MULTIPLY;
                    index++;
                    return;
                }
                case '!': {
                    tokenType = NOT;
                    index++;
                    return;
                }
                case '(': {
                    tokenType = OPEN;
                    index++;
                    return;
                }
                case '|': {
                    tokenType = OR;
                    index++;
                    return;
                }
            }
            String name = "";
            if ((isLetter(cur) && isLowerCase(cur)) || (isDigit(cur) && tokenType == VAR)) {
                while (index < str.length() && (isLetter(cur) && isLowerCase(cur)) || isDigit(cur)) {
                    name += cur;
                    index++;

                    if (index < str.length()) {
                        cur = str.charAt(index);
                    } else {
                        break;
                    }
                }

                if (cur == '(' && tokenType != ANY && tokenType != EXIST) {
                    if (str.charAt(index - 1) == '(' && (str.charAt(index - 2) == '@' || str.charAt(index - 2) == '?')) {
                        prevVariable = name;
                    }
                    tokenType = FUNCTION;
                    prevPredicate = name;
                } else {
                    tokenType = VAR;
                    prevVariable = name;
                }
                return;
            }

            if ((isLetter(cur) && isUpperCase(cur)) || (isDigit(cur) && tokenType == PREDICATE)) {
                tokenType = PREDICATE;
                while (index < str.length() && (isLetter(cur) && isUpperCase(cur)) || isDigit(cur)) {
                    prevPredicate = String.valueOf(cur);
                    index++;
                    if (index < str.length()) {
                        cur = str.charAt(index);
                    } else {
                        return;
                    }
                }
                return;
            }

            if (isDigit(cur)) {
                tokenType = CONST;
                while (index < str.length() && isDigit(cur)) {
                    prevConst = String.valueOf(cur);
                    index++;
                    if (index < str.length()) {
                        cur = str.charAt(index);
                    } else {
                        return;
                    }
                }
                return;
            }
            if (!isWhitespace(cur)) {
                tokenType = SKIP;
                index++;
            }
        }

        public String getRest() {
            return str.substring(index);
        }
    }

    private Expression fetchImplication() {
        Expression out = fetchDisjunction();
        if (tokenizer.tokenType == IMPLICATION) {
            tokenizer = new Tokenizer(tokenizer.getRest());
            out = new Implication(out, fetchImplication());
        }
        return out;
    }

    private Expression fetchDisjunction() {
        Expression out = fetchConjunction();
        while (tokenizer.tokenType == OR) {
            tokenizer.parseNext();
            out = new Or(out, fetchConjunction());
        }
        return out;
    }

    private Expression fetchConjunction() {
        Expression out = fetchUnary();
        while (tokenizer.tokenType == AND) {
            tokenizer.parseNext();
            out = new And(out, fetchUnary());
        }
        return out;
    }

    private Expression fetchPredicate() {
        Expression out = fetchTerm();
        if (out == null) {
            while (tokenizer.tokenType == PREDICATE) {
                tokenizer.parseNext();
                String value = tokenizer.prevPredicate;
                ArrayList<Expression> vars = new ArrayList<>();

                if (tokenizer.tokenType == OPEN) {
                    do {
                        tokenizer.parseNext();
                        vars.add(fetchTerm());
                    } while (tokenizer.tokenType != CLOSE);
                    tokenizer.parseNext();
                }
                out = new Predicate(value, vars);
            }
        }
        return out;
    }

    private Expression fetchTerm() {
        Expression out = fetchSum();
        while (tokenizer.tokenType == EQUAL) {
            tokenizer.parseNext();
            out = new Equal(out, fetchSum());
        }
        return out;
    }

    private Expression fetchSum() {
        Expression out = fetchIncrement();
        while (tokenizer.tokenType == ADD || tokenizer.tokenType == MULTIPLY) {
            if (tokenizer.tokenType == MULTIPLY) {
                tokenizer.parseNext();
                out = new Multiply(out, fetchIncrement());
            } else {
                tokenizer.parseNext();
                out = new Add(out, fetchIncrement());
            }
        }
        return out;
    }

    private Expression fetchIncrement() {
        Expression out = fetchFunction();
        while (tokenizer.tokenType == INCREMENT) {
            tokenizer.parseNext();
            out = new Increment(out);
        }
        return out;
    }

    private Expression fetchFunction() {
        Expression out = fetchLow();
        if (out == null) {
            while (tokenizer.tokenType == FUNCTION) {
                tokenizer.parseNext();
                String name = tokenizer.prevPredicate;
                ArrayList<Expression> vars = new ArrayList<>();

                if (tokenizer.tokenType == OPEN) {
                    do {
                        tokenizer.parseNext();
                        vars.add(fetchTerm());
                    } while (tokenizer.tokenType != CLOSE);
                    tokenizer.parseNext();
                }

                out = new Function(name, vars);
            }
        }
        return out;
    }

    private Expression fetchLow() {
        Expression out;
        if (tokenizer.tokenType == OPEN) {
            tokenizer.parseNext();
            out = fetchImplication();
            tokenizer.parseNext();
            return out;
        }

        if (tokenizer.tokenType == VAR) {
            out = new Variable(tokenizer.prevVariable);
            tokenizer.parseNext();
            return out;
        }

        if (tokenizer.tokenType == CONST) {
            out = new Const(tokenizer.prevConst);
            tokenizer.parseNext();
            return out;
        }
        return null;
    }

    private Expression fetchUnary() {
        Expression out;
        List<OperationTypes> unary = new ArrayList<>();
        Stack<Variable> names = new Stack<>();

        while (tokenizer.tokenType == ANY || tokenizer.tokenType == EXIST || tokenizer.tokenType == NOT) {
            if (tokenizer.tokenType == NOT) {
                unary.add(tokenizer.tokenType);
                tokenizer.parseNext();
            } else {
                unary.add(tokenizer.tokenType);
                tokenizer.parseNext();
                while (tokenizer.tokenType == OPEN) tokenizer.parseNext();
                names.push(new Variable(tokenizer.prevVariable));
                tokenizer.parseNext();
                while (tokenizer.tokenType == CLOSE) tokenizer.parseNext();
            }
        }
        out = fetchPredicate();
        Collections.reverse(unary);
        for (OperationTypes type : unary) {
            if (type == ANY) out = new Any(names.pop(), out);
            if (type == EXIST) out = new Exist(names.pop(), out);
            if (type == NOT) out = new Not(out);
        }
        return out;
    }
}
