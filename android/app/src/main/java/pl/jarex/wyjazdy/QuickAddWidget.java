package pl.jarex.wyjazdy;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;

/** Mały widżet „Szybki wydatek”: dwa duże przyciski + waluta / + zł. */
public class QuickAddWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) WidgetUpdater.updateQuick(context, mgr, id);
    }
}
