package pl.jarex.wyjazdy;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Random;

/**
 * Małe okno „Nowy wydatek” otwierane z widżetu – nad ekranem głównym, bez uruchamiania całej aplikacji.
 * Kwota → kto zapłacił → kategoria → Zapisz. Wydatek trafia prosto do Firebase (REST),
 * a gdy nie ma internetu – do kolejki, którą aplikacja wyśle przy następnym otwarciu.
 */
public class QuickAddActivity extends Activity {

    static final String EXTRA_CUR = "pl.jarex.wyjazdy.CUR";
    static final String EXTRA_CAT = "pl.jarex.wyjazdy.CAT";
    static final String KEY_QUEUE = "queue";

    private static final int BG = Color.parseColor("#181B21");
    private static final int CARD2 = Color.parseColor("#22262E");
    private static final int LINE = Color.parseColor("#33FFFFFF");
    private static final int MUTED = Color.parseColor("#A4ABB8");
    private static final int ACCENT = Color.parseColor("#3B82F6");
    private static final int GREEN = Color.parseColor("#16A34A");

    private JSONObject data;
    private String code, foreign, foreignSym, currency, payer, category;
    private double rate;
    private String amount = "";
    private TextView amountView, convView, saveView, curForeign, curPln;
    private final List<TextView> payerViews = new ArrayList<>();
    private final List<String> payerIds = new ArrayList<>();
    private final List<TextView> catViews = new ArrayList<>();
    private final List<String> catNames = new ArrayList<>();
    private boolean saving = false;

    private int dp(float v) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics());
    }

    private GradientDrawable round(int color, float radiusDp, int stroke) {
        GradientDrawable g = new GradientDrawable();
        g.setColor(color);
        g.setCornerRadius(dp(radiusDp));
        if (stroke != 0) g.setStroke(dp(1), stroke);
        return g;
    }

    private TextView text(String s, float sp, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        t.setTextColor(color);
        if (bold) t.setTypeface(Typeface.DEFAULT_BOLD);
        return t;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        data = WidgetUpdater.readData(this);
        JSONArray members = data != null ? data.optJSONArray("members") : null;
        if (data == null || data.optBoolean("closed", false) || members == null || members.length() == 0) {
            Intent i = new Intent(this, MainActivity.class);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
            finish();
            return;
        }
        code = data.optString("code", "");
        foreign = data.optString("foreign", "EUR");
        foreignSym = data.optString("foreignSym", "€");
        rate = data.optDouble("rate", 1);
        String cur = getIntent().getStringExtra(EXTRA_CUR);
        currency = ("PLN".equals(cur) || "PLN".equals(foreign)) ? "PLN" : foreign;
        category = getIntent().getStringExtra(EXTRA_CAT);
        payer = data.optString("me", "");
        for (int i = 0; i < members.length(); i++) {
            JSONObject m = members.optJSONObject(i);
            if (m != null) payerIds.add(m.optString("id"));
        }
        if (payer.isEmpty() || !payerIds.contains(payer)) payer = payerIds.get(0);
        JSONArray cats = data.optJSONArray("cats");
        if (cats != null) for (int i = 0; i < cats.length() && catNames.size() < 8; i++) {
            String c = cats.optString(i, "");
            if (!c.isEmpty()) catNames.add(c);
        }
        if (catNames.isEmpty()) { catNames.add("Jedzenie"); catNames.add("Kawa"); catNames.add("Zakupy"); catNames.add("Inne"); }
        if (category != null && !category.isEmpty() && !catNames.contains(category)) catNames.add(0, category);
        if (category == null || category.isEmpty()) category = catNames.get(0);
        buildUi(members);
    }

    private void buildUi(JSONArray members) {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#99000000"));
        root.setOnClickListener(v -> finish());

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        GradientDrawable cbg = new GradientDrawable();
        cbg.setColor(BG);
        float r = dp(26);
        cbg.setCornerRadii(new float[]{r, r, r, r, 0, 0, 0, 0});
        card.setBackground(cbg);
        card.setPadding(dp(18), dp(14), dp(18), dp(18));
        card.setClickable(true);
        FrameLayout.LayoutParams clp = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM);
        root.addView(card, clp);
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            card.setPadding(dp(18), dp(14), dp(18), dp(18) + insets.getSystemWindowInsetBottom());
            return insets;
        });

        // nagłówek
        LinearLayout head = new LinearLayout(this);
        head.setOrientation(LinearLayout.HORIZONTAL);
        head.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout titles = new LinearLayout(this);
        titles.setOrientation(LinearLayout.VERTICAL);
        titles.addView(text("Nowy wydatek", 19, Color.WHITE, true));
        TextView sub = text(data.optString("title", "Wyjazd"), 13.5f, MUTED, false);
        sub.setSingleLine(true);
        sub.setEllipsize(TextUtils.TruncateAt.END);
        titles.addView(sub);
        head.addView(titles, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        TextView close = text("✕", 18, Color.WHITE, false);
        close.setGravity(Gravity.CENTER);
        close.setBackground(round(CARD2, 22, 0));
        close.setOnClickListener(v -> finish());
        head.addView(close, new LinearLayout.LayoutParams(dp(44), dp(44)));
        card.addView(head);

        // waluta
        if (!"PLN".equals(foreign)) {
            LinearLayout seg = new LinearLayout(this);
            seg.setOrientation(LinearLayout.HORIZONTAL);
            seg.setBackground(round(CARD2, 14, 0));
            seg.setPadding(dp(4), dp(4), dp(4), dp(4));
            curForeign = segBtn(foreignSym + "  " + ("EUR".equals(foreign) ? "Euro" : foreign));
            curPln = segBtn("zł  Złotówki");
            curForeign.setOnClickListener(v -> { currency = foreign; refresh(); });
            curPln.setOnClickListener(v -> { currency = "PLN"; refresh(); });
            seg.addView(curForeign, new LinearLayout.LayoutParams(0, dp(42), 1));
            seg.addView(curPln, new LinearLayout.LayoutParams(0, dp(42), 1));
            LinearLayout.LayoutParams sp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            sp.topMargin = dp(12);
            card.addView(seg, sp);
        }

        // kwota
        amountView = text("0", 44, Color.WHITE, true);
        amountView.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams ap = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        ap.topMargin = dp(8);
        card.addView(amountView, ap);
        convView = text("", 13, MUTED, false);
        convView.setGravity(Gravity.CENTER);
        card.addView(convView);

        // kto zapłacił
        card.addView(label("Kto zapłacił?"));
        HorizontalScrollView hs = new HorizontalScrollView(this);
        hs.setHorizontalScrollBarEnabled(false);
        LinearLayout prow = new LinearLayout(this);
        prow.setOrientation(LinearLayout.HORIZONTAL);
        String me = data.optString("me", "");
        for (int i = 0; i < members.length(); i++) {
            JSONObject m = members.optJSONObject(i);
            if (m == null) continue;
            String id = m.optString("id");
            String name = id.equals(me) ? "Ty (" + m.optString("name") + ")" : m.optString("name");
            TextView chip = text(name, 14.5f, Color.WHITE, true);
            chip.setGravity(Gravity.CENTER);
            chip.setPadding(dp(14), 0, dp(14), 0);
            chip.setOnClickListener(v -> { payer = id; refresh(); });
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(40));
            lp.rightMargin = dp(8);
            prow.addView(chip, lp);
            payerViews.add(chip);
        }
        hs.addView(prow);
        card.addView(hs);

        // kategoria
        card.addView(label("Kategoria"));
        LinearLayout row = null;
        for (int i = 0; i < catNames.size(); i++) {
            if (i % 4 == 0) {
                row = new LinearLayout(this);
                row.setOrientation(LinearLayout.HORIZONTAL);
                LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(38));
                if (i > 0) rp.topMargin = dp(6);
                card.addView(row, rp);
            }
            String c = catNames.get(i);
            TextView chip = text(c, 12.5f, Color.WHITE, true);
            chip.setGravity(Gravity.CENTER);
            chip.setSingleLine(true);
            chip.setEllipsize(TextUtils.TruncateAt.END);
            chip.setPadding(dp(4), 0, dp(4), 0);
            chip.setOnClickListener(v -> { category = c; refresh(); });
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1);
            if (i % 4 != 0) lp.leftMargin = dp(6);
            row.addView(chip, lp);
            catViews.add(chip);
        }
        if (catNames.size() % 4 != 0 && row != null) {
            for (int k = catNames.size() % 4; k < 4; k++) {
                View pad = new View(this);
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1);
                lp.leftMargin = dp(6);
                row.addView(pad, lp);
            }
        }

        // klawiatura
        String[] keys = {"1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "⌫"};
        LinearLayout krow = null;
        for (int i = 0; i < keys.length; i++) {
            if (i % 3 == 0) {
                krow = new LinearLayout(this);
                krow.setOrientation(LinearLayout.HORIZONTAL);
                LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(50));
                rp.topMargin = dp(i == 0 ? 14 : 6);
                card.addView(krow, rp);
            }
            String k = keys[i];
            TextView key = text(k, 24, Color.WHITE, false);
            key.setGravity(Gravity.CENTER);
            key.setBackground(round(CARD2, 14, LINE));
            key.setOnClickListener(v -> press(k));
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1);
            if (i % 3 != 0) lp.leftMargin = dp(6);
            krow.addView(key, lp);
        }

        // zapisz
        saveView = text("Zapisz", 17, Color.WHITE, true);
        saveView.setGravity(Gravity.CENTER);
        saveView.setBackground(round(GREEN, 18, 0));
        saveView.setOnClickListener(v -> save());
        LinearLayout.LayoutParams svp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(54));
        svp.topMargin = dp(12);
        card.addView(saveView, svp);

        setContentView(root);
        refresh();
    }

    private TextView segBtn(String s) {
        TextView t = text(s, 15, Color.WHITE, true);
        t.setGravity(Gravity.CENTER);
        return t;
    }

    private TextView label(String s) {
        TextView t = text(s.toUpperCase(new Locale("pl", "PL")), 11.5f, MUTED, true);
        t.setLetterSpacing(0.1f);
        t.setPadding(dp(2), dp(14), 0, dp(6));
        return t;
    }

    private double value() {
        try { return amount.isEmpty() ? 0 : Double.parseDouble(amount.replace(',', '.')); } catch (Exception e) { return 0; }
    }

    static String money(double v, String cur, String sym) {
        String s = String.format(new Locale("pl", "PL"), "%,.2f", v).replace(' ', ' ').replace(' ', ' ');
        return s + " " + ("PLN".equals(cur) ? "zł" : sym);
    }

    private String symFor(String cur) { return "PLN".equals(cur) ? "zł" : foreignSym; }

    private void press(String k) {
        if ("⌫".equals(k)) {
            if (!amount.isEmpty()) amount = amount.substring(0, amount.length() - 1);
        } else if (",".equals(k)) {
            if (!amount.contains(",")) amount = (amount.isEmpty() ? "0" : amount) + ",";
        } else {
            int comma = amount.indexOf(',');
            if (comma >= 0 && amount.length() - comma > 2) return;
            if (comma < 0 && amount.replaceFirst("^0+", "").length() >= 7) return;
            amount = "0".equals(amount) ? k : amount + k;
        }
        refresh();
    }

    private void refresh() {
        String shown = amount.isEmpty() ? "0" : amount;
        amountView.setText(shown + " " + symFor(currency));
        amountView.setTextColor(amount.isEmpty() ? MUTED : Color.WHITE);
        double v = value();
        if ("PLN".equals(foreign)) convView.setText("");
        else if ("PLN".equals(currency)) convView.setText("≈ " + money(v / (rate > 0 ? rate : 1), foreign, foreignSym));
        else convView.setText("≈ " + money(v * rate, "PLN", "zł") + " · kurs " + String.format(new Locale("pl", "PL"), "%.4f", rate));
        if (curForeign != null) {
            boolean f = !"PLN".equals(currency);
            curForeign.setBackground(f ? round(ACCENT, 11, 0) : null);
            curPln.setBackground(!f ? round(ACCENT, 11, 0) : null);
            curForeign.setTextColor(f ? Color.WHITE : MUTED);
            curPln.setTextColor(!f ? Color.WHITE : MUTED);
        }
        for (int i = 0; i < payerViews.size(); i++) {
            boolean on = payerIds.get(i).equals(payer);
            payerViews.get(i).setBackground(round(on ? Color.parseColor("#2E3B57") : CARD2, 20, on ? ACCENT : LINE));
        }
        for (int i = 0; i < catViews.size(); i++) {
            boolean on = catNames.get(i).equals(category);
            catViews.get(i).setBackground(round(on ? ACCENT : CARD2, 12, on ? 0 : LINE));
        }
        boolean ok = v > 0 && !saving;
        saveView.setAlpha(ok ? 1f : 0.45f);
        saveView.setText(v > 0 ? "Zapisz · " + category + " · " + money(v, currency, foreignSym) : "Wpisz kwotę");
    }

    private void save() {
        double v = Math.round(value() * 100) / 100.0;
        if (!(v > 0) || saving) return;
        saving = true;
        refresh();
        final JSONObject exp = new JSONObject();
        try {
            exp.put("id", Long.toString(System.currentTimeMillis(), 36) + randomChars(6));
            exp.put("amount", v);
            exp.put("currency", currency);
            exp.put("type", "shared");
            exp.put("payer", payer);
            exp.put("recipient", JSONObject.NULL);
            exp.put("splitAmong", JSONObject.NULL);
            exp.put("shares", JSONObject.NULL);
            exp.put("category", category);
            exp.put("desc", category);
            exp.put("note", "");
            exp.put("date", new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date()));
            exp.put("createdAt", System.currentTimeMillis());
        } catch (Exception e) { saving = false; return; }
        final Context app = getApplicationContext();
        final String fbKey = data.optString("fbKey", "");
        final String fbProject = data.optString("fbProject", "");
        final String label = category + " · " + money(v, currency, foreignSym);
        final String payerName = payerName(payer);
        new Thread(() -> {
            boolean sent = false;
            if (!fbKey.isEmpty() && !fbProject.isEmpty()) {
                try { sendToFirestore(app, fbKey, fbProject, code, exp); sent = true; } catch (Throwable e) { sent = false; }
            }
            if (!sent) enqueue(app, code, exp);
            addRecentLocally(app, code, category + " · " + payerName, money(v, currency, foreignSym));
            final boolean ok = sent;
            runOnUiThread(() -> {
                Toast.makeText(app, ok ? "Zapisano: " + label : "Zapisano. Wyślę przy otwarciu aplikacji: " + label, Toast.LENGTH_LONG).show();
                finish();
            });
        }).start();
    }

    private String payerName(String id) {
        JSONArray ms = data.optJSONArray("members");
        if (ms != null) for (int i = 0; i < ms.length(); i++) {
            JSONObject m = ms.optJSONObject(i);
            if (m != null && id.equals(m.optString("id"))) return m.optString("name");
        }
        return "";
    }

    private static String randomChars(int n) {
        String abc = "abcdefghijkmnpqrstuvwxyz23456789";
        Random r = new Random();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) sb.append(abc.charAt(r.nextInt(abc.length())));
        return sb.toString();
    }

    // ---------------------------------------------------------------- kolejka i lokalny podgląd

    static synchronized void enqueue(Context ctx, String code, JSONObject exp) {
        SharedPreferences p = ctx.getSharedPreferences(WidgetUpdater.PREFS, Context.MODE_PRIVATE);
        try {
            JSONArray q = new JSONArray(p.getString(KEY_QUEUE, "[]"));
            q.put(new JSONObject().put("code", code).put("exp", exp));
            p.edit().putString(KEY_QUEUE, q.toString()).apply();
        } catch (Exception e) { /* pomiń */ }
    }

    static synchronized JSONArray takeQueue(Context ctx) {
        SharedPreferences p = ctx.getSharedPreferences(WidgetUpdater.PREFS, Context.MODE_PRIVATE);
        JSONArray q;
        try { q = new JSONArray(p.getString(KEY_QUEUE, "[]")); } catch (Exception e) { q = new JSONArray(); }
        p.edit().remove(KEY_QUEUE).apply();
        return q;
    }

    static void addRecentLocally(Context ctx, String code, String title, String amount) {
        try {
            JSONObject trips = WidgetUpdater.readTrips(ctx);
            JSONObject d = trips.optJSONObject(code);
            if (d == null) return;
            JSONArray old = d.optJSONArray("recent");
            JSONArray rec = new JSONArray();
            rec.put(new JSONObject().put("t", title).put("a", amount));
            if (old != null) for (int i = 0; i < old.length() && rec.length() < 5; i++) rec.put(old.get(i));
            d.put("recent", rec);
            trips.put(code, d);
            WidgetUpdater.writeTrips(ctx, trips);
            WidgetUpdater.updateAll(ctx);
        } catch (Exception e) { /* pomiń */ }
    }

    // ---------------------------------------------------------------- Firebase przez REST

    private static String readAll(InputStream in) throws Exception {
        if (in == null) return "";
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        in.close();
        return new String(out.toByteArray(), StandardCharsets.UTF_8);
    }

    private static JSONObject post(String url, String body, String type, String bearer) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setRequestMethod("POST");
        c.setConnectTimeout(10000);
        c.setReadTimeout(15000);
        c.setDoOutput(true);
        c.setRequestProperty("Content-Type", type);
        c.setRequestProperty("Referer", "https://localhost/");
        if (bearer != null) c.setRequestProperty("Authorization", "Bearer " + bearer);
        OutputStream os = c.getOutputStream();
        os.write(body.getBytes(StandardCharsets.UTF_8));
        os.close();
        int code = c.getResponseCode();
        String resp = readAll(code < 300 ? c.getInputStream() : c.getErrorStream());
        c.disconnect();
        if (code >= 300) throw new Exception("HTTP " + code + " " + resp);
        return new JSONObject(resp.isEmpty() ? "{}" : resp);
    }

    /** Anonimowe konto Firebase dla widżetu (osobne od aplikacji) – token odświeżany automatycznie. */
    private static String idToken(Context ctx, String key) throws Exception {
        SharedPreferences p = ctx.getSharedPreferences(WidgetUpdater.PREFS, Context.MODE_PRIVATE);
        String tok = p.getString("fbId", null);
        long exp = p.getLong("fbExp", 0);
        if (tok != null && System.currentTimeMillis() < exp - 60000) return tok;
        String refresh = p.getString("fbRefresh", null);
        JSONObject r = null;
        String uid = p.getString("fbUid", "");
        if (refresh != null) {
            try {
                r = post("https://securetoken.googleapis.com/v1/token?key=" + key,
                        "grant_type=refresh_token&refresh_token=" + URLEncoder.encode(refresh, "UTF-8"),
                        "application/x-www-form-urlencoded", null);
                tok = r.getString("id_token");
                refresh = r.getString("refresh_token");
                exp = System.currentTimeMillis() + Long.parseLong(r.optString("expires_in", "3600")) * 1000L;
                uid = r.optString("user_id", uid);
            } catch (Exception e) { r = null; }
        }
        if (r == null) {
            r = post("https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=" + key,
                    "{\"returnSecureToken\":true}", "application/json", null);
            tok = r.getString("idToken");
            refresh = r.getString("refreshToken");
            exp = System.currentTimeMillis() + Long.parseLong(r.optString("expiresIn", "3600")) * 1000L;
            uid = r.optString("localId", "");
        }
        p.edit().putString("fbId", tok).putLong("fbExp", exp).putString("fbRefresh", refresh).putString("fbUid", uid).apply();
        return tok;
    }

    private static JSONObject fsValue(Object v) throws Exception {
        JSONObject o = new JSONObject();
        if (v == null || v == JSONObject.NULL) o.put("nullValue", JSONObject.NULL);
        else if (v instanceof Double || v instanceof Float) o.put("doubleValue", ((Number) v).doubleValue());
        else if (v instanceof Long || v instanceof Integer) o.put("integerValue", String.valueOf(v));
        else o.put("stringValue", String.valueOf(v));
        return o;
    }

    static void sendToFirestore(Context ctx, String key, String project, String code, JSONObject exp) throws Exception {
        String tok = idToken(ctx, key);
        String uid = ctx.getSharedPreferences(WidgetUpdater.PREFS, Context.MODE_PRIVATE).getString("fbUid", "");
        JSONObject fields = new JSONObject();
        fields.put("amount", fsValue(exp.getDouble("amount")));
        fields.put("currency", fsValue(exp.getString("currency")));
        fields.put("type", fsValue("shared"));
        fields.put("payer", fsValue(exp.getString("payer")));
        fields.put("recipient", fsValue(null));
        fields.put("splitAmong", fsValue(null));
        fields.put("shares", fsValue(null));
        fields.put("category", fsValue(exp.getString("category")));
        fields.put("desc", fsValue(exp.getString("desc")));
        fields.put("note", fsValue(""));
        fields.put("date", fsValue(exp.getString("date")));
        fields.put("createdAt", fsValue(exp.getLong("createdAt")));
        fields.put("createdBy", fsValue(uid));
        String url = "https://firestore.googleapis.com/v1/projects/" + project + "/databases/(default)/documents/trips/"
                + URLEncoder.encode(code, "UTF-8") + "/expenses?documentId=" + URLEncoder.encode(exp.getString("id"), "UTF-8");
        post(url, new JSONObject().put("fields", fields).toString(), "application/json", tok);
    }
}
