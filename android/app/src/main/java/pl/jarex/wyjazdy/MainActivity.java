package pl.jarex.wyjazdy;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetBridge.class);
        rememberWidgetAction(getIntent());
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        rememberWidgetAction(intent);
        super.onNewIntent(intent);
    }

    @Override
    public void onPause() {
        super.onPause();
        // Po wyjściu z aplikacji odśwież widżety ostatnio zapisanymi danymi.
        WidgetUpdater.updateAll(this);
    }

    private void rememberWidgetAction(Intent intent) {
        if (intent == null) return;
        String add = intent.getStringExtra(WidgetUpdater.EXTRA_ADD);
        if (add != null) {
            WidgetBridge.pendingAction = add;
            intent.removeExtra(WidgetUpdater.EXTRA_ADD);
        }
    }
}
