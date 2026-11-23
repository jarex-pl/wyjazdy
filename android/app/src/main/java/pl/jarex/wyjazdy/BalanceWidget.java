package pl.jarex.wyjazdy;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;

/** Widżet „Bilans wyjazdu”: Twój bilans, ostatnie wydatki, przyciski + waluta / + zł. */
public class BalanceWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) WidgetUpdater.updateBalance(context, mgr, id);
    }
}
