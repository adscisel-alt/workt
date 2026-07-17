package pl.asystent.glos.actions

import android.content.Context
import pl.asystent.glos.Action

/**
 * "Naucz mnie czegoś", "powiedz ciekawostkę" — losuje jedną z ciekawostek.
 * To najprostsza, offline'owa wersja; docelowo można podłączyć tu model
 * językowy (np. Claude API), by generował świeże treści na dowolny temat.
 */
class LearnAction : Action {

    override val name = "ciekawostka"

    private val triggers = listOf("naucz", "ciekawostk", "powiedz coś", "fakt", "czegoś nowego")

    private val facts = listOf(
        "Miód nigdy się nie psuje — znaleziono jadalny miód sprzed ponad trzech tysięcy lat.",
        "Ośmiornice mają trzy serca i niebieską krew.",
        "Wieża Eiffla latem rośnie o około 15 centymetrów, bo metal rozszerza się od ciepła.",
        "Ludzki nos potrafi rozróżnić około biliona różnych zapachów.",
        "Banany są jagodami z botanicznego punktu widzenia, a truskawki nie.",
        "Serce krewetki znajduje się w jej głowie.",
        "Na Wenus doba trwa dłużej niż rok — planeta obraca się wolniej, niż okrąża Słońce.",
        "Koty potrafią wydawać około stu różnych dźwięków, a psy tylko około dziesięciu.",
    )

    // Prosty licznik zamiast losowania — po kolei podaje kolejne ciekawostki.
    private var index = 0

    override fun matches(input: String): Boolean = triggers.any { input.contains(it) }

    override fun run(context: Context, input: String, onDone: (String) -> Unit) {
        val fact = facts[index % facts.size]
        index++
        onDone("Oto ciekawostka. $fact")
    }
}
