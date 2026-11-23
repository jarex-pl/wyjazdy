package pl.jarex.wyjazdy;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

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
        String photoKey = data.optString("photoKey", "");
        String photoUrl = data.optString("photoUrl", "");
        String photoData = data.optString("photoData", "");
        data.remove("photoData");
        prefs.edit().putString(WidgetUpdater.KEY_DATA, data.toString()).apply();
        WidgetUpdater.updateAll(ctx);
        call.resolve();
        String oldKey = prefs.getString(PHOTO_KEY, "");
        if (photoKey.isEmpty()) {
            if (!oldKey.isEmpty()) {
                WidgetUpdater.photoFile(ctx).delete();
                prefs.edit().remove(PHOTO_KEY).apply();
                WidgetUpdater.updateAll(ctx);
            }
        } else if (!photoKey.equals(oldKey)) {
            final Context app = ctx.getApplicationContext();
            new Thread(() -> loadPhoto(app, photoKey, photoUrl, photoData)).start();
        }
    }

    static final String PHOTO_KEY = "photoKey";

    /** Pobiera zdjęcie miejsca (albo dekoduje własne), przycina do proporcji widżetu i zapisuje w pamięci aplikacji. */
    static void loadPhoto(Context ctx, String key, String url, String base64) {
        try {
            byte[] bytes;
            if (!base64.isEmpty()) {
                bytes = Base64.decode(base64, Base64.DEFAULT);
            } else if (!url.isEmpty()) {
                HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                c.setConnectTimeout(10000);
                c.setReadTimeout(15000);
                c.setRequestProperty("User-Agent", "Wyjazdy/1.0 (Android; https://github.com/jarex-pl/wyjazdy)");
                if (c.getResponseCode() != 200) { c.disconnect(); return; }
                InputStream in = c.getInputStream();
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buf = new byte[16384];
                int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                in.close();
                c.disconnect();
                bytes = out.toByteArray();
            } else {
                return;
            }
            BitmapFactory.Options o = new BitmapFactory.Options();
            o.inJustDecodeBounds = true;
            BitmapFactory.decodeByteArray(bytes, 0, bytes.length, o);
            int sample = 1;
            while (o.outWidth / (sample * 2) >= 700) sample *= 2;
            BitmapFactory.Options o2 = new BitmapFactory.Options();
            o2.inSampleSize = sample;
            Bitmap src = BitmapFactory.decodeByteArray(bytes, 0, bytes.length, o2);
            if (src == null) return;
            int w = src.getWidth(), h = src.getHeight();
            int cw = w, ch = w / 2;
            if (ch > h) { ch = h; cw = h * 2; }
            Bitmap crop = Bitmap.createBitmap(src, (w - cw) / 2, (h - ch) / 2, cw, ch);
            Bitmap out = cw > 720 ? Bitmap.createScaledBitmap(crop, 720, 360, true) : crop;
            File f = WidgetUpdater.photoFile(ctx);
            FileOutputStream fos = new FileOutputStream(f);
            out.compress(Bitmap.CompressFormat.JPEG, 85, fos);
            fos.close();
            ctx.getSharedPreferences(WidgetUpdater.PREFS, Context.MODE_PRIVATE).edit().putString(PHOTO_KEY, key).apply();
            WidgetUpdater.updateAll(ctx);
        } catch (Throwable e) {
            // brak internetu albo zły plik – widżet zostaje z granatowym tłem
        }
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
