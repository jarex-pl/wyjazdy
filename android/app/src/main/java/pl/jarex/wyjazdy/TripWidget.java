package pl.jarex.wyjazdy;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;

/** Widżet „Wyjazd ze zdjęciem”: zdjęcie miejsca, wydatki, koszt na osobę, Twój bilans i przycisk dodawania. */
public class TripWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) WidgetUpdater.updateTrip(context, mgr, id);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent != null && WidgetUpdater.ACTION_NEXT.equals(intent.getAction())) {
            WidgetUpdater.nextTrip(context);
            return;
        }
        super.onReceive(context, intent);
    }
}
