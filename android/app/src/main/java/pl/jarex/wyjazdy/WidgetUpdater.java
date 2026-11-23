package pl.jarex.wyjazdy;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;

/** Rysuje oba widżety na podstawie danych zapisanych przez aplikację. */
public final class WidgetUpdater {

    static final String PREFS = "wyjazdy_widget";
    static final String KEY_DATA = "data";
    static final String EXTRA_ADD = "pl.jarex.wyjazdy.ADD";
    static final String KEY_TRIPS = "trips";
    static final String KEY_CURRENT = "current";
    static final String ACTION_NEXT = "pl.jarex.wyjazdy.NEXT_TRIP";

    private static final int[] ROW_IDS = {R.id.row1, R.id.row2, R.id.row3};
    private static final int[] ROW_TITLE = {R.id.row1_title, R.id.row2_title, R.id.row3_title};
    private static final int[] ROW_AMOUNT = {R.id.row1_amount, R.id.row2_amount, R.id.row3_amount};

    private WidgetUpdater() {}

    /** Kolory i tła dla jednego stylu widżetu (wybór w Ustawieniach aplikacji). */
    static final class Style { int bg, btn1, btn2, btn1Text, btn2Text, title, label, value, pos, neg, row; }

    static Style style(JSONObject d) {
        String n = d != null ? d.optString("style", "navy") : "navy";
        Style s = new Style();
        int white = Color.WHITE;
        if ("navy".equals(n)) {
            s.bg = R.drawable.wbg_navy; s.btn1 = R.drawable.wbtn_blue_g; s.btn2 = R.drawable.wbtn_navy2;
            s.btn1Text = white; s.btn2Text = white;
            s.title = Color.parseColor("#DCE8FF"); s.label = Color.parseColor("#BFD0F0");
            s.value = white; s.pos = Color.parseColor("#4ADE80"); s.neg = Color.parseColor("#FCA5A5");
            s.row = white;
            return s;
        }
        if ("light".equals(n)) {
            s.bg = R.drawable.wbg_light; s.btn1 = R.drawable.wbtn_accent_l; s.btn2 = R.drawable.wbtn_gray_l;
            s.btn1Text = white; s.btn2Text = Color.parseColor("#1B1C1F");
            s.title = Color.parseColor("#64656B"); s.label = Color.parseColor("#64656B");
            s.value = Color.parseColor("#1B1C1F"); s.pos = Color.parseColor("#1E8A57"); s.neg = Color.parseColor("#C9483B");
            s.row = Color.parseColor("#1B1C1F");
            return s;
        }
        if ("dark".equals(n) || "clear".equals(n)) {
            s.bg = "dark".equals(n) ? R.drawable.wbg_dark : R.drawable.wbg_clear;
            s.btn1 = R.drawable.wbtn_accent; s.btn2 = R.drawable.wbtn_gray_d;
            s.btn1Text = white; s.btn2Text = Color.parseColor("#F2F2F0");
            s.title = Color.parseColor("#A0A1A7"); s.label = Color.parseColor("#A0A1A7");
            s.value = Color.parseColor("#F2F2F0"); s.pos = Color.parseColor("#5CC08E"); s.neg = Color.parseColor("#E5776B");
            s.row = Color.parseColor("#F2F2F0");
            if ("clear".equals(n)) { s.title = s.label = Color.parseColor("#E6FFFFFF"); s.value = s.row = white; s.pos = Color.parseColor("#B8FFE0"); s.neg = Color.parseColor("#FFD2CC"); }
            return s;
        }
        s.btn1 = R.drawable.wbtn_white; s.btn2 = R.drawable.wbtn_glass; s.btn2Text = white;
        switch (n) {
            case "violet": s.bg = R.drawable.wbg_violet; s.btn1Text = Color.parseColor("#5B2FD6"); break;
            case "teal": s.bg = R.drawable.wbg_teal; s.btn1Text = Color.parseColor("#0E7C6E"); break;
            case "sunset": s.bg = R.drawable.wbg_sunset; s.btn1Text = Color.parseColor("#D6455D"); break;
            default: s.bg = R.drawable.wbg_blue; s.btn1Text = Color.parseColor("#1554E8");
        }
        s.title = Color.parseColor("#E6EEFF"); s.label = Color.parseColor("#D2DDF7");
        s.value = white; s.pos = Color.parseColor("#B8FFE0"); s.neg = Color.parseColor("#FFD2CC"); s.row = white;
        return s;
    }

    private static void bg(RemoteViews v, int id, int res) { v.setInt(id, "setBackgroundResource", res); }


    /** Dane wszystkich zapamiętanych wyjazdów: kod → dane widżetu. */
    static JSONObject readTrips(Context ctx) {
        String raw = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_TRIPS, null);
        if (raw == null) return new JSONObject();
        try { return new JSONObject(raw); } catch (Exception e) { return new JSONObject(); }
    }

    static void writeTrips(Context ctx, JSONObject trips) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_TRIPS, trips.toString()).apply();
    }

    static List<String> tripCodes(Context ctx) {
        List<String> codes = new ArrayList<>();
        Iterator<String> it = readTrips(ctx).keys();
        while (it.hasNext()) codes.add(it.next());
        Collections.sort(codes);
        return codes;
    }

    static String currentCode(Context ctx) {
        String c = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_CURRENT, "");
        JSONObject trips = readTrips(ctx);
        if (c != null && trips.has(c)) return c;
        List<String> codes = tripCodes(ctx);
        return codes.isEmpty() ? "" : codes.get(0);
    }

    static void setCurrent(Context ctx, String code) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_CURRENT, code).apply();
    }

    /** Przełącza widżety na następny zapamiętany wyjazd. */
    static void nextTrip(Context ctx) {
        List<String> codes = tripCodes(ctx);
        if (codes.size() < 2) return;
        int i = codes.indexOf(currentCode(ctx));
        setCurrent(ctx, codes.get((i + 1) % codes.size()));
        updateAll(ctx);
    }

    static JSONObject readData(Context ctx) {
        String code = currentCode(ctx);
        if (!code.isEmpty()) {
            JSONObject d = readTrips(ctx).optJSONObject(code);
            if (d != null) return d;
        }
        String raw = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_DATA, null);
        if (raw == null) return null;
        try { return new JSONObject(raw); } catch (Exception e) { return null; }
    }

    /** „⇄ 1/2” gdy zapamiętano kilka wyjazdów, inaczej pusty tekst. */
    static String switchMark(Context ctx) {
        List<String> codes = tripCodes(ctx);
        if (codes.size() < 2) return "";
        return "⇄ " + (codes.indexOf(currentCode(ctx)) + 1) + "/" + codes.size();
    }

    static PendingIntent switchIntent(Context ctx, int requestCode) {
        Intent i = new Intent(ctx, TripWidget.class);
        i.setAction(ACTION_NEXT);
        return PendingIntent.getBroadcast(ctx, requestCode, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void updateAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] balanceIds = mgr.getAppWidgetIds(new ComponentName(ctx, BalanceWidget.class));
        for (int id : balanceIds) updateBalance(ctx, mgr, id);
        int[] quickIds = mgr.getAppWidgetIds(new ComponentName(ctx, QuickAddWidget.class));
        for (int id : quickIds) updateQuick(ctx, mgr, id);
        int[] oweIds = mgr.getAppWidgetIds(new ComponentName(ctx, OweWidget.class));
        for (int id : oweIds) updateOwe(ctx, mgr, id);
        int[] tripIds = mgr.getAppWidgetIds(new ComponentName(ctx, TripWidget.class));
        for (int id : tripIds) updateTrip(ctx, mgr, id);
    }

    static File photoFile(Context ctx, String code) {
        return new File(ctx.getFilesDir(), "widget_photo_" + code.replaceAll("[^A-Za-z0-9-]", "_") + ".jpg");
    }

    static void updateTrip(Context ctx, AppWidgetManager mgr, int widgetId) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_trip);
        JSONObject d = readData(ctx);
        v.setOnClickPendingIntent(R.id.trip_root, openApp(ctx, null, 400));
        Bitmap photo = null;
        File f = photoFile(ctx, currentCode(ctx));
        if (d != null && f.exists()) {
            try { photo = BitmapFactory.decodeFile(f.getAbsolutePath()); } catch (Throwable e) { photo = null; }
        }
        if (photo != null) v.setImageViewBitmap(R.id.trip_photo, photo);
        else v.setImageViewResource(R.id.trip_photo, R.drawable.wbg_navy);
        if (d == null) {
            v.setTextViewText(R.id.trip_name, "Wyjazdy");
            v.setTextViewText(R.id.trip_sub, "Otwórz aplikację i wybierz wyjazd");
            v.setViewVisibility(R.id.trip_stats, View.GONE);
            v.setViewVisibility(R.id.trip_add, View.GONE);
            mgr.updateAppWidget(widgetId, v);
            return;
        }
        boolean closed = d.optBoolean("closed", false);
        String mark = switchMark(ctx);
        v.setTextViewText(R.id.trip_chip, (mark.isEmpty() ? "" : mark + "  ·  ") + (closed ? "ROZLICZONY" : "BIEŻĄCY WYJAZD"));
        if (!mark.isEmpty()) v.setOnClickPendingIntent(R.id.trip_chip, switchIntent(ctx, 402));
        v.setTextViewText(R.id.trip_name, d.optString("title", "Wyjazd"));
        v.setTextViewText(R.id.trip_sub, d.optString("subtitle", ""));
        v.setViewVisibility(R.id.trip_stats, View.VISIBLE);
        v.setTextViewText(R.id.trip_total, d.optString("totalText", "—"));
        v.setTextViewText(R.id.trip_per, d.optString("perPersonText", "—"));
        v.setTextViewText(R.id.trip_bal_label, d.optString("balanceLabel", "Twój bilans"));
        v.setTextViewText(R.id.trip_bal, d.optString("balanceText", "—"));
        String sign = d.optString("balanceSign", "zero");
        v.setTextColor(R.id.trip_bal, "pos".equals(sign) ? Color.parseColor("#4ADE80") : "neg".equals(sign) ? Color.parseColor("#FCA5A5") : Color.WHITE);
        if (closed) {
            v.setViewVisibility(R.id.trip_add, View.GONE);
        } else {
            String foreign = d.optString("foreign", "EUR");
            v.setViewVisibility(R.id.trip_add, View.VISIBLE);
            v.setTextViewText(R.id.trip_add, "PLN".equals(foreign) ? "+ Dodaj" : "+ " + d.optString("foreignSym", "€"));
            v.setOnClickPendingIntent(R.id.trip_add, openApp(ctx, "PLN".equals(foreign) ? "PLN" : "foreign", 401));
        }
        mgr.updateAppWidget(widgetId, v);
    }

    static PendingIntent openApp(Context ctx, String add, int requestCode) {
        Intent i = new Intent(ctx, MainActivity.class);
        String code = currentCode(ctx);
        String act = (add == null ? "open" : add) + "|" + code;
        i.setAction("pl.jarex.wyjazdy.ACTION_" + act);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (!code.isEmpty() || add != null) i.putExtra(EXTRA_ADD, act);
        return PendingIntent.getActivity(ctx, requestCode, i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void updateBalance(Context ctx, AppWidgetManager mgr, int widgetId) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_balance);
        JSONObject d = readData(ctx);
        Style st = style(d);
        bg(v, R.id.widget_root, st.bg);
        bg(v, R.id.btn_foreign, st.btn1); v.setTextColor(R.id.btn_foreign, st.btn1Text);
        bg(v, R.id.btn_pln, st.btn2); v.setTextColor(R.id.btn_pln, st.btn2Text);
        v.setTextColor(R.id.trip_title, st.title);
        v.setTextColor(R.id.balance_label, st.label);
        v.setTextColor(R.id.balance_hint, st.label);
        v.setTextColor(R.id.balance_value, st.value);
        for (int i = 0; i < ROW_IDS.length; i++) { v.setTextColor(ROW_TITLE[i], st.row); v.setTextColor(ROW_AMOUNT[i], st.row); }
        v.setOnClickPendingIntent(R.id.widget_root, openApp(ctx, null, 100));
        if (d == null) {
            v.setTextViewText(R.id.trip_title, "Wyjazdy");
            v.setTextViewText(R.id.balance_label, "Otwórz aplikację i wybierz wyjazd");
            v.setTextViewText(R.id.balance_value, "—");
            v.setTextViewText(R.id.balance_hint, "");
            v.setViewVisibility(R.id.buttons, View.GONE);
            for (int r : ROW_IDS) v.setViewVisibility(r, View.GONE);
            mgr.updateAppWidget(widgetId, v);
            return;
        }
        boolean closed = d.optBoolean("closed", false);
        String sw = switchMark(ctx);
        v.setTextViewText(R.id.trip_title, d.optString("title", "Wyjazd") + (sw.isEmpty() ? "" : "   " + sw));
        if (!sw.isEmpty()) v.setOnClickPendingIntent(R.id.trip_title, switchIntent(ctx, 103));
        v.setTextViewText(R.id.balance_label, d.optString("balanceLabel", "Twój bilans"));
        v.setTextViewText(R.id.balance_value, d.optString("balanceText", "0,00 zł"));
        String sign = d.optString("balanceSign", "zero");
        int color = "pos".equals(sign) ? st.pos : "neg".equals(sign) ? st.neg : st.value;
        v.setTextColor(R.id.balance_value, color);
        v.setTextViewText(R.id.balance_hint, d.optString("balanceHint", ""));

        String foreign = d.optString("foreign", "EUR");
        String foreignSym = d.optString("foreignSym", "€");
        if (closed) {
            v.setViewVisibility(R.id.buttons, View.GONE);
        } else {
            v.setViewVisibility(R.id.buttons, View.VISIBLE);
            if ("PLN".equals(foreign)) {
                v.setViewVisibility(R.id.btn_foreign, View.GONE);
            } else {
                v.setViewVisibility(R.id.btn_foreign, View.VISIBLE);
                v.setTextViewText(R.id.btn_foreign, "+ " + foreignSym);
                v.setOnClickPendingIntent(R.id.btn_foreign, openApp(ctx, "foreign", 101));
            }
            v.setOnClickPendingIntent(R.id.btn_pln, openApp(ctx, "PLN", 102));
        }

        JSONArray recent = d.optJSONArray("recent");
        for (int i = 0; i < ROW_IDS.length; i++) {
            JSONObject r = recent != null ? recent.optJSONObject(i) : null;
            if (r == null) { v.setViewVisibility(ROW_IDS[i], View.GONE); continue; }
            v.setViewVisibility(ROW_IDS[i], View.VISIBLE);
            v.setTextViewText(ROW_TITLE[i], r.optString("t", ""));
            v.setTextViewText(ROW_AMOUNT[i], r.optString("a", ""));
        }
        mgr.updateAppWidget(widgetId, v);
    }

    static void updateOwe(Context ctx, AppWidgetManager mgr, int widgetId) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_owe);
        JSONObject d = readData(ctx);
        Style st = style(d);
        bg(v, R.id.owe_root, st.bg);
        v.setTextColor(R.id.owe_title, st.title);
        v.setTextColor(R.id.owe_who, st.row);
        v.setTextColor(R.id.owe_amount, st.value);
        v.setTextColor(R.id.owe_extra, st.label);
        JSONObject o = d != null ? d.optJSONObject("owe") : null;
        v.setOnClickPendingIntent(R.id.owe_root, openApp(ctx, null, 300));
        if (o == null) {
            v.setTextViewText(R.id.owe_title, "Rozliczenie");
            v.setTextViewText(R.id.owe_who, "Otwórz aplikację");
            v.setTextViewText(R.id.owe_amount, "");
            v.setTextViewText(R.id.owe_extra, "");
        } else {
            String sw = switchMark(ctx);
            v.setTextViewText(R.id.owe_title, o.optString("title", "Rozliczenie") + (sw.isEmpty() ? "" : "  " + sw));
            if (!sw.isEmpty()) v.setOnClickPendingIntent(R.id.owe_title, switchIntent(ctx, 301));
            v.setTextViewText(R.id.owe_who, o.optString("who", ""));
            v.setTextViewText(R.id.owe_amount, o.optString("amount", ""));
            String sign = o.optString("sign", "zero");
            v.setTextColor(R.id.owe_amount, "neg".equals(sign) ? st.neg : "pos".equals(sign) ? st.pos : st.value);
            v.setTextViewText(R.id.owe_extra, o.optString("extra", ""));
        }
        mgr.updateAppWidget(widgetId, v);
    }

    static void updateQuick(Context ctx, AppWidgetManager mgr, int widgetId) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_quick);
        JSONObject d = readData(ctx);
        Style st = style(d);
        bg(v, R.id.quick_root, st.bg);
        bg(v, R.id.quick_foreign, st.btn1); v.setTextColor(R.id.quick_foreign, st.btn1Text);
        bg(v, R.id.quick_pln, st.btn2); v.setTextColor(R.id.quick_pln, st.btn2Text);
        v.setTextColor(R.id.quick_title, st.title);
        String foreign = d != null ? d.optString("foreign", "EUR") : "EUR";
        String foreignSym = d != null ? d.optString("foreignSym", "€") : "€";
        String sw = switchMark(ctx);
        v.setTextViewText(R.id.quick_title, (d != null ? d.optString("title", "Wyjazdy") : "Wyjazdy") + (sw.isEmpty() ? "" : "  " + sw));
        if (!sw.isEmpty()) v.setOnClickPendingIntent(R.id.quick_title, switchIntent(ctx, 203));
        if ("PLN".equals(foreign)) {
            v.setViewVisibility(R.id.quick_foreign, View.GONE);
        } else {
            v.setViewVisibility(R.id.quick_foreign, View.VISIBLE);
            v.setTextViewText(R.id.quick_foreign, "+ " + foreignSym);
            v.setOnClickPendingIntent(R.id.quick_foreign, openApp(ctx, "foreign", 201));
        }
        v.setOnClickPendingIntent(R.id.quick_pln, openApp(ctx, "PLN", 202));
        int[] catIds = {R.id.quick_cat1, R.id.quick_cat2, R.id.quick_cat3, R.id.quick_cat4};
        String[] defCats = {"Jedzenie", "Kawa", "Paliwo", "Zakupy"};
        JSONArray cats = d != null ? d.optJSONArray("quickCats") : null;
        for (int i = 0; i < catIds.length; i++) {
            String c = cats != null && cats.optString(i, "").length() > 0 ? cats.optString(i, "") : defCats[i];
            v.setTextViewText(catIds[i], c);
            v.setInt(catIds[i], "setBackgroundResource", st.btn2);
            v.setTextColor(catIds[i], st.btn2Text);
            v.setOnClickPendingIntent(catIds[i], openApp(ctx, "cat~" + c, 210 + i));
        }
        v.setOnClickPendingIntent(R.id.quick_root, openApp(ctx, null, 200));
        mgr.updateAppWidget(widgetId, v);
    }
}
