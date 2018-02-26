package mathlogic.homework2;

import javafx.util.Pair;
import mathlogic.homework2.expressions.Expression;
import mathlogic.homework2.parser.Axioms;
import mathlogic.homework2.parser.Deductor;
import mathlogic.homework2.parser.Matcher;
import mathlogic.homework2.parser.Parser;

import java.io.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static mathlogic.homework2.parser.Support.*;

public class Main {
    public static boolean DEBUG = false;

    private static File input = new File("input.txt");
    private static File outputC = new File("output.txt");
    private static File outputP = new File("deduction.txt");

    private static BufferedReader reader = null;
    private static PrintWriter writerC = null, writerP = null;

    private static int lineNumber = 1;
    private static List<String> lines = new ArrayList<>();
    private static List<Expression> expressions = new ArrayList<>();

    private static Matcher matcher;
    private static Parser parser;

    public static void main(String[] args) throws Exception {
        reader = new BufferedReader(new InputStreamReader(new FileInputStream(input), "UTF-8"));
        writerC = new PrintWriter(new OutputStreamWriter(new FileOutputStream(outputC), "UTF-8"));
        writerP = new PrintWriter(new OutputStreamWriter(new FileOutputStream(outputP), "UTF-8"));

        matcher = new Matcher();
        parser = new Parser();
        Axioms.parseAxioms(parser);

        String line = reader.readLine();
        checkProof(line);

        if (line.contains("|-") && !supposes.isEmpty()) makeDeduction(line);

        reader.close();
        writerC.close();
        writerP.close();
    }

    private static void makeDeduction(String first) {
        Deductor deductor = new Deductor();
        deductor.deduct(first, lines, matcher, writerP);
    }

    private static void checkProof(String firstLine) throws Exception {
        firstLine = firstLine.replaceAll("\\s", "");
        Map<String, Integer> sups = getSuppositions(firstLine, parser);

        if (!firstLine.contains("|-")) { // Is just proof ?
            Expression exp = parser.parse(firstLine);
            Expression back = parser.parse(firstLine);

            int axiom = matcher.matchProposalAxiom(exp, Axioms.proposAxioms);
            if (axiom > 0) {
                writerC.println("(" + (lineNumber++) + ") " + firstLine + " (Сх. акс. " + axiom + ")");
                expressions.add(back.getInstance());
            }

            axiom = matcher.matchFormalAxiom(exp, Axioms.formalAxioms);
            if (axiom > 0) {
                int offset = Axioms.proposAxioms.length + 2 + axiom;
                writerC.println("(" + (lineNumber++) + ") " + firstLine + " (Сх. акс. " + offset + ")");
                expressions.add(exp);
            }

            if (matcher.finalCheck(exp)) {
                writerC.println("(" + (lineNumber++) + ") " + firstLine + " (Сх. акс. #)");
                expressions.add(exp);
            }
        }

        String str = reader.readLine();
        while (str != null) {
            str = str.replaceAll("\\s", "");
            lines.add(str);
            if (sups.containsKey(str)) {
                int index = sups.get(str);
                writerC.println("(" + (lineNumber++) + ") " + str + " (Предп. " + (index + 1) + ")");
                expressions.add(supposes.get(index));
                str = reader.readLine();
                continue;
            }
            Expression exp = parser.parse(str);
            matcher.change = false;
            boolean flag = false;
            for (int i = 0; i < supposes.size(); i++) {
                if (supposes.get(0) != null && matcher.deepEqual(supposes.get(i), exp)) {
                    writerC.println("(" + (lineNumber++) + ") " + str + " (Предп. " + (i + 1) + ")");
                    expressions.add(supposes.get(i));
                    flag = true;
                    break;
                }
            }
            if (flag) {
                str = reader.readLine();
                continue;
            }
            Expression back = parser.parse(str);
            int axiom = matcher.matchProposalAxiom(exp, Axioms.proposAxioms);
            if (axiom > 0) {
                writerC.println("(" + (lineNumber++) + ") " + str + " (Сх. акс. " + axiom + ")");
                expressions.add(back.getInstance());
                str = reader.readLine();
                continue;
            }

            axiom = matcher.matchFormalAxiom(exp, Axioms.formalAxioms);
            if (axiom > 0) {
                int offset = Axioms.proposAxioms.length + 2 + axiom;
                writerC.println("(" + (lineNumber++) + ") " + str + " (Сх. акс. " + offset + ")");
                expressions.add(exp);
                str = reader.readLine();
                continue;
            }

            if (matcher.finalCheck(exp)) {
                writerC.println("(" + (lineNumber++) + ") " + str + " (Сх. акс. #)");
                expressions.add(exp);
                str = reader.readLine();
                continue;
            }

            matcher.any = false;
            matcher.anySub = false;
            if (matcher.matchAny(exp, expressions, supposes) > -1) {
                writerC.println("(" + (lineNumber++) + ") " + str + " (Введение квантора всеобщности)");
                expressions.add(exp);
                str = reader.readLine();
                continue;
            }
            exp = back.getInstance();

            matcher.ext = false;
            matcher.extSub = false;
            int ind = matcher.matchExist(exp, expressions, supposes);
            if (ind > -1) {
                writerC.println("(" + (lineNumber++) + ") " + str + " (Введение квантора существования)");
                expressions.add(exp);
                str = reader.readLine();
                continue;
            }
            exp = back.getInstance();

            Pair<Integer, Integer> mp = checkMP(exp, expressions, matcher);
            if (mp.getKey() > -1 && mp.getValue() > -1) {
                int f = mp.getKey() + 1, s = mp.getValue() + 1;
                writerC.println("(" + (lineNumber++) + ") " + str + " (M.P. " + f + ", " + s + ")");
                expressions.add(exp);
                str = reader.readLine();
                continue;
            }
            writerC.print("(" + (lineNumber++) + ") " + str + " Вывод некорректен, начиная с формулы № " + (lineNumber - 1));
            checkForSpecial(exp, str, matcher, writerC);
            return;
        }
    }
}
