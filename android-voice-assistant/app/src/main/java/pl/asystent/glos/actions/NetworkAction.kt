package pl.asystent.glos.actions

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import pl.asystent.glos.Action

/**
 * "Sprawdź sieć", "czy mam internet", "jakie wifi" — odczytuje aktualny
 * stan połączenia z ConnectivityManager i (dla Wi-Fi) siłę sygnału.
 */
class NetworkAction : Action {

    override val name = "stan sieci"

    private val triggers = listOf("sieć", "siec", "wifi", "wi-fi", "internet", "połączeni", "polaczeni")

    override fun matches(input: String): Boolean = triggers.any { input.contains(it) }

    override fun run(context: Context, input: String, onDone: (String) -> Unit) {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = cm.activeNetwork
        val caps = network?.let { cm.getNetworkCapabilities(it) }

        if (caps == null || !caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) {
            onDone("Brak połączenia z internetem.")
            return
        }

        val message = when {
            caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> {
                val wifi = context.applicationContext
                    .getSystemService(Context.WIFI_SERVICE) as WifiManager
                val rssi = wifi.connectionInfo.rssi
                val bars = WifiManager.calculateSignalLevel(rssi, 5)
                "Jesteś połączony przez Wi-Fi. Siła sygnału: $bars na 5."
            }
            caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ->
                "Jesteś połączony przez sieć komórkową."
            caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) ->
                "Jesteś połączony przez kabel Ethernet."
            else -> "Masz aktywne połączenie z internetem."
        }
        onDone(message)
    }
}
