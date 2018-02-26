package mathlogic.homework2;

import javafx.util.Pair;
import mathlogic.homework2.expressions.Operations;
import mathlogic.homework2.expressions.Expression;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.PrintWriter;
import java.util.*;

public class Support {
    public static List<Expression> supposes = new ArrayList<>();
    public static Map<String, Expression> map;

    public static Map<String, Integer> getSuppositions(String str, Parser parser) {
        Map<String, Integer> out = new HashMap<>();
        if (!str.contains("|-")) return out;

        int index = 0, number = 0, balance = 0;
        String cur = "";
        while (index < str.length()) {
            while (str.charAt(index) == ' ') index++;
            while (index < str.length() && (str.charAt(index) != ',' || balance != 0) && str.charAt(index) != '|') {
                if (str.charAt(index) != ' ') cur += str.charAt(index);
                if (str.charAt(index) == '(') balance++;
                if (str.charAt(index) == ')') balance--;
                index++;
            }
            if (!cur.equals("")) {
                out.put(cur, number);
                number++;
            }
            supposes.add(parser.parse(cur));
            cur = "";
            if (index < str.length() && str.charAt(index) == ',') index++;
            while (index < str.length() && str.charAt(index) == ' ') index++;
            if (index < str.length() && str.charAt(index) == '|') {
                index += 2;
                while (index < str.length() && str.charAt(index) == ' ') index++;
                index = str.length();
            }
        }
        return out;
    }

    public static Pair<Integer, Integer> checkMP(Expression exp, List<Expression> exps, Matcher matcher) {
        int first = -1, second = -1;
        for (int i = exps.size() - 1; i >= 0; i--) {
            Expression tmp = exps.get(i);
            if (tmp instanceof Operations.Implication) {
                Operations.Implication itmp = (Operations.Implication) tmp;
                if (matcher.deepEqual(exp, itmp.right)) {
                    for (int j = exps.size() - 1; j >= 0; j--) {
                        map = new HashMap<>();
                        if (matcher.structEqual(itmp.left, exps.get(j), map)) {
                            first = i;
                            second = j;
                            break;
                        }
                    }
                    if (first != -1) break;
                }
            }
        }
        return new Pair<Integer, Integer>(first, second);
    }

    public static void checkForSpecial(Expression exp, String str, Matcher matcher, PrintWriter pw) {
        if (matcher.any && matcher.anySub) {
            pw.println(": используется правило с квантором по переменной "
                    + ((Operations.Any) ((Operations.Implication) exp).right).variable.name + " входящей свободно в допущение "
                    + supposes.get(supposes.size() - 1));
        } else if (matcher.any) {
            pw.println(": Переменная " + ((Operations.Any) ((Operations.Implication) exp).right).variable.name
                    + " входит свободно в формулу " + (((Operations.Implication) exp).left));
        }


        if (matcher.change) {
            Expression tmp1 = null, tmp2 = null;
            if (exp instanceof Operations.Implication && ((Operations.Implication) exp).left instanceof Operations.Any) {
                Operations.Implication iexp = (Operations.Implication) exp;
                Operations.Any aiexp = (Operations.Any) iexp.left;
                matcher.structEqual(iexp.right, aiexp.expression, map);
                tmp1 = map.get(map.keySet().toArray()[0]);
                tmp2 = aiexp.variable;
            } else if (exp instanceof Operations.Implication && ((Operations.Implication) exp).left instanceof Operations.Exist) {
                Operations.Implication iexp = (Operations.Implication) exp;
                Operations.Exist eiexp = (Operations.Exist) iexp.right;
                matcher.structEqual(iexp.left, eiexp.expression, map);
                tmp1 = map.get(eiexp.variable.name);
                tmp2 = eiexp.variable;
            }

            pw.println(": Терм " + tmp1 + " не свободен для подстановки в формулу "
                    + str + " вместо переменной " + tmp2);
        }
    }

    public static List<String> replace(String path, List<String> names) {
        List<String> out = new ArrayList<>();

        try (Scanner sc = new Scanner(new File(path))) {
            while (sc.hasNext()) {
                String str = sc.next();
                str = str.replace("B", "Value1");
                str = str.replace("C", "Value2");
                str = str.replace("x", "Value3");
                str = str.replace("A", "(" + (names.get(0)) + ")");
                if (names.size() > 1) str = str.replace("Value1", "(" + names.get(1) + ")");
                if (names.size() > 2) str = str.replace("Value2", "(" + names.get(2) + ")");
                if (names.size() > 3) str = str.replace("Value3", names.get(3));
                out.add(str);
            }
        } catch (FileNotFoundException fnfe) {
            System.err.println("File `" + path + "` is not found");
        }
        return out;
    }
}
