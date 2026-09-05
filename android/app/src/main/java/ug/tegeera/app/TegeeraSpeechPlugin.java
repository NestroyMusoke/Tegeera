package ug.tegeera.app;

import android.Manifest;
import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;
import java.util.Locale;

@CapacitorPlugin(
    name = "TegeeraSpeech",
    permissions = {
        @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO })
    }
)
public class TegeeraSpeechPlugin extends Plugin implements RecognitionListener {
    private SpeechRecognizer recognizer;
    private boolean cancellationRequested;

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", SpeechRecognizer.isRecognitionAvailable(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void requestMicrophonePermission(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            resolvePermission(call);
            return;
        }
        requestPermissionForAlias("microphone", call, "microphonePermissionCallback");
    }

    @PermissionCallback
    private void microphonePermissionCallback(PluginCall call) {
        resolvePermission(call);
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            call.reject("Microphone permission is required.", "permission_denied");
            return;
        }
        if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
            call.reject("No Android speech recognition service is available.", "unavailable");
            return;
        }

        getActivity().runOnUiThread(() -> {
            releaseRecognizer();
            cancellationRequested = false;
            recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
            recognizer.setRecognitionListener(this);
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
            String language = call.getString("language", Locale.getDefault().toLanguageTag());
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language);
            recognizer.startListening(intent);
            emitListening(true);
            call.resolve();
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (recognizer != null) recognizer.stopListening();
            call.resolve();
        });
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            cancellationRequested = true;
            if (recognizer != null) recognizer.cancel();
            releaseRecognizer();
            emitListening(false);
            call.resolve();
        });
    }

    @Override
    public void onReadyForSpeech(Bundle params) {
        emitListening(true);
    }

    @Override public void onBeginningOfSpeech() {}
    @Override public void onRmsChanged(float rmsdB) {}
    @Override public void onBufferReceived(byte[] buffer) {}

    @Override
    public void onEndOfSpeech() {
        emitListening(false);
    }

    @Override
    public void onError(int error) {
        emitListening(false);
        if (!cancellationRequested) {
            JSObject payload = new JSObject();
            payload.put("code", Integer.toString(error));
            payload.put("message", errorMessage(error));
            notifyListeners("recognitionError", payload);
        }
        releaseRecognizer();
    }

    @Override
    public void onResults(Bundle results) {
        emitTranscript("finalResult", results);
        releaseRecognizer();
    }

    @Override
    public void onPartialResults(Bundle partialResults) {
        emitTranscript("partialResult", partialResults);
    }

    @Override public void onEvent(int eventType, Bundle params) {}

    @Override
    protected void handleOnDestroy() {
        releaseRecognizer();
    }

    private void resolvePermission(PluginCall call) {
        JSObject result = new JSObject();
        PermissionState state = getPermissionState("microphone");
        result.put("state", state == PermissionState.GRANTED ? "granted" : "denied");
        call.resolve(result);
    }

    private void emitTranscript(String eventName, Bundle results) {
        ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (matches == null || matches.isEmpty()) return;
        JSObject payload = new JSObject();
        payload.put("transcript", matches.get(0));
        float[] scores = results.getFloatArray(SpeechRecognizer.CONFIDENCE_SCORES);
        if (scores != null && scores.length > 0 && scores[0] >= 0f) {
            payload.put("confidence", scores[0]);
        }
        notifyListeners(eventName, payload);
    }

    private void emitListening(boolean listening) {
        JSObject payload = new JSObject();
        payload.put("listening", listening);
        notifyListeners("listeningState", payload);
    }

    private void releaseRecognizer() {
        if (recognizer != null) {
            recognizer.destroy();
            recognizer = null;
        }
    }

    private String errorMessage(int error) {
        switch (error) {
            case SpeechRecognizer.ERROR_AUDIO:
                return "The microphone could not capture audio.";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                return "Microphone permission is missing.";
            case SpeechRecognizer.ERROR_NETWORK:
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
                return "Offline recognition was not available on this device.";
            case SpeechRecognizer.ERROR_NO_MATCH:
                return "I could not understand that phrase.";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
                return "Speech recognition is already busy.";
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                return "I did not hear any speech.";
            default:
                return "Speech recognition stopped unexpectedly.";
        }
    }
}
