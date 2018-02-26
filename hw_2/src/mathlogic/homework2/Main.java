package mathlogic.homework2;

import javafx.util.Pair;
import mathlogic.homework2.expressions.Expression;

import java.io.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static mathlogic.homework2.Support.*;

public class Main {
    static boolean DEBUG = false;

    private static File input = new File("input.txt");
    private static File outputC = new File("output.txt");
    private static File outputP = new File("deduction.txt");

    private static BufferedReader breader = null;
    private static PrintWriter pwriterC = null, pwriterP = null;

    private static int lineNumber = 1;
    private static List<String> lines = new ArrayList<>();
    private static List<Expression> expressions = new ArrayList<>();

    private static Matcher matcher;
    private static Parser parser;

    public static void main(String[] args) throws Exception {
        breader = new BufferedReader(new InputStreamReader(new FileInputStream(input), "UTF-8"));
        pwriterC = new PrintWriter(new OutputStreamWriter(new FileOutputStream(outputC), "UTF-8"));
        pwriterP = new PrintWriter(new OutputStreamWriter(new FileOutputStream(outputP), "UTF-8"));

        matcher = new Matcher();
        parser = new Parser();
        Axioms.parseAxioms(parser);

        String line = breader.readLine();
        checkProof(line);

        if (line.contains("|-") && !supposes.isEmpty()) makeDeduction(line);

        breader.close();
        pwriterC.close();
        pwriterP.close();
    }

    private static void makeDeduction(String first) {
        Deductor deductor = new Deductor();
        deductor.deduct(first, lines, matcher, pwriterP);
    }

    private static void checkProof(String firstLine) throws Exception {
        firstLine = firstLine.replaceAll("\\s", "");
        Map<String, Integer> sups = getSuppositions(firstLine, parser);

        if (!firstLine.contains("|-")) { // Is just proof ?
            Expression exp = parser.parse(firstLine);
            Expression back = parser.parse(firstLine);

            int axiom = matcher.matchProposalAxiom(exp, Axioms.proposAxioms);
            if (axiom > 0) {
                pwriterC.println("(" + (lineNumber++) + ") " + firstLine + " (Сх. акс. " + axiom + ")");
                expressions.add(back.getInstance());
            }

            axiom = matcher.matchFormalAxiom(exp, Axioms.formalAxioms);
            if (axiom > 0) {
                int offset = Axioms.proposAxioms.length + 2 + axiom;
                pwriterC.println("(" + (lineNumber++) + ") " + firstLine + " (Сх. акс. " + offset + ")");
                expressions.add(exp);
            }

            if (matcher.finalCheck(exp)) {
                pwriterC.println("(" + (lineNumber++) + ") " + firstLine + " (Сх. акс. #)");
                expressions.add(exp);
            }
        }

        String str = breader.readLine();
        while (str != null) {
            str = str.replaceAll("\\s", "");
            lines.add(str);

            //System.out.println ("Input: " + str);

            if (sups.containsKey(str)) {
                int index = sups.get(str);
                pwriterC.println("(" + (lineNumber++) + ") " + str + " (Предп. " + (index + 1) + ")");
                expressions.add(supposes.get(index));
                str = breader.readLine();
                continue;
            }

            Expression exp = parser.parse(str);
            //System.out.println (exp);
            matcher.change = false;

            boolean flag = false;
            for (int i = 0; i < supposes.size(); i++) {
                if (supposes.get(0) != null && matcher.deepEqual(supposes.get(i), exp)) {
                    pwriterC.println("(" + (lineNumber++) + ") " + str + " (Предп. " + (i + 1) + ")");
                    expressions.add(supposes.get(i));
                    flag = true;
                    break;
                }
            }
            if (flag) {
                str = breader.readLine();
                continue;
            }
            Expression back = parser.parse(str);

            int axiom = matcher.matchProposalAxiom(exp, Axioms.proposAxioms);
            if (axiom > 0) {
                pwriterC.println("(" + (lineNumber++) + ") " + str + " (Сх. акс. " + axiom + ")");
                expressions.add(back.getInstance());
                str = breader.readLine();
                continue;
            }

            axiom = matcher.matchFormalAxiom(exp, Axioms.formalAxioms);
            if (axiom > 0) {
                int offset = Axioms.proposAxioms.length + 2 + axiom;
                pwriterC.println("(" + (lineNumber++) + ") " + str + " (Сх. акс. " + offset + ")");
                expressions.add(exp);
                str = breader.readLine();
                continue;
            }

            if (matcher.finalCheck(exp)) {
                pwriterC.println("(" + (lineNumber++) + ") " + str + " (Сх. акс. #)");
                expressions.add(exp);
                str = breader.readLine();
                continue;
            }

            matcher.any = false;
            matcher.anySub = false;
            if (matcher.matchAny(exp, expressions, supposes) > -1) {
                pwriterC.println("(" + (lineNumber++) + ") " + str + " (Введение квантора всеобщности)");
                expressions.add(exp);
                str = breader.readLine();
                continue;
            }
            exp = back.getInstance();

            matcher.ext = false;
            matcher.extSub = false;
            //System.out.println (exp);
            int ind = matcher.matchExist(exp, expressions, supposes);
            //System.out.println (lineNumber + " Exist: " + ind);
            if (ind > -1) {
                pwriterC.println("(" + (lineNumber++) + ") " + str + " (Введение квантора существования)");
                expressions.add(exp);
                str = breader.readLine();
                continue;
            }
            //System.out.println ("Not exist");
            exp = back.getInstance();

            Pair<Integer, Integer> mp = checkMP(exp, expressions, matcher);
            if (mp.getKey() > -1 && mp.getValue() > -1) {
                int f = mp.getKey() + 1, s = mp.getValue() + 1;
                pwriterC.println("(" + (lineNumber++) + ") " + str + " (M.P. " + f + ", " + s + ")");
                expressions.add(exp);
                str = breader.readLine();
                continue;
            }
            pwriterC.print("(" + (lineNumber++) + ") " + str + " Вывод некорректен, начиная с формулы № " + (lineNumber - 1));
            checkForSpecial(exp, str, matcher, pwriterC);
            return;
        }
    }
}
