package pl.asystent.glos

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.android.material.button.MaterialButton

/**
 * Jeden ekran: duży przycisk mikrofonu, podgląd rozpoznanego tekstu i
 * odpowiedź asystenta. Naciśnij → mów → asystent wykona akcję i odpowie głosem.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var voice: VoiceController
    private lateinit var router: CommandRouter

    private lateinit var micButton: MaterialButton
    private lateinit var statusLabel: TextView
    private lateinit var heardLabel: TextView
    private lateinit var answerLabel: TextView

    private val requestPermissions = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { grants ->
        if (grants[Manifest.permission.RECORD_AUDIO] == true) {
            statusLabel.text = getString(R.string.tap_to_speak)
        } else {
            statusLabel.text = getString(R.string.mic_denied)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        micButton = findViewById(R.id.micButton)
        statusLabel = findViewById(R.id.statusLabel)
        heardLabel = findViewById(R.id.heardLabel)
        answerLabel = findViewById(R.id.answerLabel)

        router = CommandRouter(this)
        voice = VoiceController(
            context = this,
            onState = { state -> runOnUiThread { renderState(state) } },
            onPartial = { text -> runOnUiThread { heardLabel.text = text } },
            onResult = { text -> runOnUiThread { onHeard(text) } },
            onError = { message -> runOnUiThread { onError(message) } },
        )
        voice.init()

        micButton.setOnClickListener { onMicTapped() }

        ensurePermissions()
    }

    private fun onMicTapped() {
        if (!hasMicPermission()) {
            ensurePermissions()
            return
        }
        heardLabel.text = ""
        answerLabel.text = ""
        voice.startListening()
    }

    private fun onHeard(text: String) {
        heardLabel.text = text
        statusLabel.text = getString(R.string.thinking)
        router.handle(text) { reply ->
            runOnUiThread {
                answerLabel.text = reply
                voice.speak(reply)
            }
        }
    }

    private fun onError(message: String) {
        statusLabel.text = getString(R.string.tap_to_speak)
        answerLabel.text = message
        voice.speak(message)
    }

    private fun renderState(state: VoiceController.State) {
        statusLabel.text = when (state) {
            VoiceController.State.LISTENING -> getString(R.string.listening)
            VoiceController.State.SPEAKING -> getString(R.string.speaking)
            VoiceController.State.IDLE -> getString(R.string.tap_to_speak)
        }
    }

    private fun hasMicPermission(): Boolean =
        ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED

    private fun ensurePermissions() {
        requestPermissions.launch(
            arrayOf(
                Manifest.permission.RECORD_AUDIO,
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION,
            )
        )
    }

    override fun onDestroy() {
        voice.shutdown()
        super.onDestroy()
    }
}
