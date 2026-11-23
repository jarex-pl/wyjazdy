package pl.jarex.wyjazdy;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;

/** Widżet „Do oddania”: kto komu ma oddać pieniądze. */
public class OweWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) WidgetUpdater.updateOwe(context, mgr, id);
    }
}
