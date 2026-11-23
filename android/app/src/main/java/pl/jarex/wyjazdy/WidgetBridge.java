package pl.jarex.wyjazdy;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Most między aplikacją (JavaScript) a widżetami na ekranie głównym.
 * JS wywołuje update({...}) przy każdej zmianie danych wyjazdu.
 */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridge extends Plugin {

    /** Akcja z widżetu ("foreign" albo "PLN") czekająca na odebranie przez JS. */
    static volatile String pendingAction = null;

    @PluginMethod
    public void update(PluginCall call) {
        JSObject data = call.getData();
        Context ctx = getContext();
        SharedPreferences prefs = ctx.getSharedPreferences(WidgetUpdater.PREFS, Context.MODE_PRIVATE);
        prefs.edit().putString(WidgetUpdater.KEY_DATA, data.toString()).apply();
        WidgetUpdater.updateAll(ctx);
        call.resolve();
    }

    @PluginMethod
    public void clear(PluginCall call) {
        Context ctx = getContext();
        ctx.getSharedPreferences(WidgetUpdater.PREFS, Context.MODE_PRIVATE).edit().remove(WidgetUpdater.KEY_DATA).apply();
        WidgetUpdater.updateAll(ctx);
        call.resolve();
    }

    @PluginMethod
    public void consumeAction(PluginCall call) {
        JSObject ret = new JSObject();
        String a = pendingAction;
        pendingAction = null;
        ret.put("action", a);
        call.resolve(ret);
    }
}
