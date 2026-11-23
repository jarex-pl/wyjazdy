package pl.jarex.wyjazdy;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/** Rysuje oba widżety na podstawie danych zapisanych przez aplikację. */
public final class WidgetUpdater {

    static final String PREFS = "wyjazdy_widget";
    static final String KEY_DATA = "data";
    static final String EXTRA_ADD = "pl.jarex.wyjazdy.ADD";

    private static final int[] ROW_IDS = {R.id.row1, R.id.row2, R.id.row3};
    private static final int[] ROW_TITLE = {R.id.row1_title, R.id.row2_title, R.id.row3_title};
    private static final int[] ROW_AMOUNT = {R.id.row1_amount, R.id.row2_amount, R.id.row3_amount};

    private WidgetUpdater() {}

    static JSONObject readData(Context ctx) {
        String raw = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_DATA, null);
        if (raw == null) return null;
        try { return new JSONObject(raw); } catch (Exception e) { return null; }
    }

    static void updateAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] balanceIds = mgr.getAppWidgetIds(new ComponentName(ctx, BalanceWidget.class));
        for (int id : balanceIds) updateBalance(ctx, mgr, id);
        int[] quickIds = mgr.getAppWidgetIds(new ComponentName(ctx, QuickAddWidget.class));
        for (int id : quickIds) updateQuick(ctx, mgr, id);
        int[] oweIds = mgr.getAppWidgetIds(new ComponentName(ctx, OweWidget.class));
        for (int id : oweIds) updateOwe(ctx, mgr, id);
    }

    static PendingIntent openApp(Context ctx, String add, int requestCode) {
        Intent i = new Intent(ctx, MainActivity.class);
        i.setAction(add == null ? Intent.ACTION_MAIN : "pl.jarex.wyjazdy.ACTION_ADD_" + add);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (add != null) i.putExtra(EXTRA_ADD, add);
        return PendingIntent.getActivity(ctx, requestCode, i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void updateBalance(Context ctx, AppWidgetManager mgr, int widgetId) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_balance);
        JSONObject d = readData(ctx);
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
        v.setTextViewText(R.id.trip_title, d.optString("title", "Wyjazd"));
        v.setTextViewText(R.id.balance_label, d.optString("balanceLabel", "Twój bilans"));
        v.setTextViewText(R.id.balance_value, d.optString("balanceText", "0,00 zł"));
        String sign = d.optString("balanceSign", "zero");
        int color = "pos".equals(sign) ? Color.parseColor("#1F45C8") : "neg".equals(sign) ? Color.parseColor("#B5520E") : Color.parseColor("#1B1F2A");
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
        JSONObject o = d != null ? d.optJSONObject("owe") : null;
        v.setOnClickPendingIntent(R.id.owe_root, openApp(ctx, null, 300));
        if (o == null) {
            v.setTextViewText(R.id.owe_title, "Rozliczenie");
            v.setTextViewText(R.id.owe_who, "Otwórz aplikację");
            v.setTextViewText(R.id.owe_amount, "");
            v.setTextViewText(R.id.owe_extra, "");
        } else {
            v.setTextViewText(R.id.owe_title, o.optString("title", "Rozliczenie"));
            v.setTextViewText(R.id.owe_who, o.optString("who", ""));
            v.setTextViewText(R.id.owe_amount, o.optString("amount", ""));
            String sign = o.optString("sign", "zero");
            v.setTextColor(R.id.owe_amount, "neg".equals(sign) ? Color.parseColor("#B5520E") : Color.parseColor("#1F45C8"));
            v.setTextViewText(R.id.owe_extra, o.optString("extra", ""));
        }
        mgr.updateAppWidget(widgetId, v);
    }

    static void updateQuick(Context ctx, AppWidgetManager mgr, int widgetId) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_quick);
        JSONObject d = readData(ctx);
        String foreign = d != null ? d.optString("foreign", "EUR") : "EUR";
        String foreignSym = d != null ? d.optString("foreignSym", "€") : "€";
        v.setTextViewText(R.id.quick_title, d != null ? d.optString("title", "Wyjazdy") : "Wyjazdy");
        if ("PLN".equals(foreign)) {
            v.setViewVisibility(R.id.quick_foreign, View.GONE);
        } else {
            v.setViewVisibility(R.id.quick_foreign, View.VISIBLE);
            v.setTextViewText(R.id.quick_foreign, "+ " + foreignSym);
            v.setOnClickPendingIntent(R.id.quick_foreign, openApp(ctx, "foreign", 201));
        }
        v.setOnClickPendingIntent(R.id.quick_pln, openApp(ctx, "PLN", 202));
        v.setOnClickPendingIntent(R.id.quick_root, openApp(ctx, null, 200));
        mgr.updateAppWidget(widgetId, v);
    }
}
