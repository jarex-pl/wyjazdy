package pl.jarex.wyjazdy;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;

/** Widżet „Wyjazd ze zdjęciem”: zdjęcie miejsca, wydatki, koszt na osobę, Twój bilans i przycisk dodawania. */
public class TripWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) WidgetUpdater.updateTrip(context, mgr, id);
    }
}
