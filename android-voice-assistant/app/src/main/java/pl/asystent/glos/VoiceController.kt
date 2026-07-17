package pl.asystent.glos

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import java.util.Locale

/**
 * Spina wbudowane rozpoznawanie mowy (STT) i syntezę mowy (TTS) Androida.
 * Wszystko po polsku, bez zewnętrznych bibliotek ani kluczy API.
 */
class VoiceController(
    private val context: Context,
    private val onState: (State) -> Unit,
    private val onPartial: (String) -> Unit,
    private val onResult: (String) -> Unit,
    private val onError: (String) -> Unit,
) {
    enum class State { IDLE, LISTENING, SPEAKING }

    private val polish = Locale("pl", "PL")

    private var tts: TextToSpeech? = null
    private var ttsReady = false

    private val recognizer: SpeechRecognizer? =
        if (SpeechRecognizer.isRecognitionAvailable(context))
            SpeechRecognizer.createSpeechRecognizer(context)
        else null

    fun init() {
        tts = TextToSpeech(context) { status ->
            if (status == TextToSpeech.SUCCESS) {
                tts?.language = polish
                ttsReady = true
            }
        }
        recognizer?.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) = onState(State.LISTENING)
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}

            override fun onError(error: Int) {
                onState(State.IDLE)
                onError(errorText(error))
            }

            override fun onPartialResults(partialResults: Bundle?) {
                partialResults
                    ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    ?.firstOrNull()
                    ?.let { onPartial(it) }
            }

            override fun onResults(results: Bundle?) {
                onState(State.IDLE)
                val text = results
                    ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                    ?.firstOrNull()
                    .orEmpty()
                if (text.isBlank()) onError("Nie rozpoznałem żadnych słów.")
                else onResult(text)
            }

            override fun onEvent(eventType: Int, params: Bundle?) {}
        })
    }

    fun startListening() {
        if (recognizer == null) {
            onError("To urządzenie nie obsługuje rozpoznawania mowy.")
            return
        }
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(
                RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
            )
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "pl-PL")
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        }
        recognizer.startListening(intent)
    }

    fun speak(text: String) {
        if (!ttsReady) return
        onState(State.SPEAKING)
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "utterance")
    }

    fun shutdown() {
        recognizer?.destroy()
        tts?.stop()
        tts?.shutdown()
    }

    private fun errorText(code: Int): String = when (code) {
        SpeechRecognizer.ERROR_AUDIO -> "Błąd nagrywania dźwięku."
        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Brak zgody na mikrofon."
        SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Problem z siecią."
        SpeechRecognizer.ERROR_NO_MATCH -> "Nie zrozumiałem, powtórz proszę."
        SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "Nie usłyszałem mowy."
        SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Chwila, jeszcze przetwarzam."
        else -> "Wystąpił błąd rozpoznawania ($code)."
    }
}
