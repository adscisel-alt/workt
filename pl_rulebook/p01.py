from common import *

# snowy foreground fill (tune after first render)
SNOW = (228, 233, 237)
STORY = (40, 44, 50)

def build():
    p = Page(1)

    # sample the actual foreground colour near the text columns
    global SNOW
    SNOW = (242, 243, 244)

    # LEFT story column
    p.cover((104, 1122, 866, 1648), SNOW)
    p.paragraphs((132, 1120, 852, 1636), [
        [it("Światło świtu przeciskało się między bogato zdobionymi kolumnami "
            "portyku otaczającego sadzawkę. Pośrodku sadzawki znajdowała się "
            "sztuczna wysepka spowita delikatną mgłą. Na wysepce stały wysokie "
            "postacie owinięte w długie białe tuniki obszyte złotem, które "
            "odprawiały rytmiczną litanię, mieszając monotonne tony swoich "
            "głosów. Otoczenie było puste, jeśli nie liczyć tajemnego symbolu "
            "wyrytego głęboko pośrodku ziemi. Pięcioramienna gwiazda wpisana w "
            "okrąg emanowała dziwnym blaskiem, niczym świetlista para unosząca "
            "się ku górze.")],
        [it("Głosy stopniowo przybierały na sile, jakby witały przybycie na "
            "wpół przezroczystej istoty o lśniącej, magnetycznej aurze. Za nią "
            "kroczył dumnie i uroczyście prawie dwumetrowy mężczyzna, okryty "
            "jedynie skąpym kawałkiem materiału przewiązanym wokół bioder. Jego "
            "oczy, głębokie i błyszczące, patrzyły prosto przed siebie; szeroka, "
            "męska, potężna pierś drżała przy każdym oddechu, a silne ramiona "
            "towarzyszyły eleganckiemu i pewnemu krokowi. Była to już tylko "
            "kwestia czasu, aż życie tego człowieka dobiegnie końca, lecz on nie "
            "wydawał się tym martwić ani odrobinę wahać. Wiedział, że jest tym "
            "wybranym, i był z tego dumny, gdyż ofiarowanie własnego ciała dla "
            "powrotu najwyższego pana było przywilejem.")],
        [it("Majestatycznym, wymierzonym krokiem przeszedł przez mały drewniany "
            "mostek, który skrzypiał pod jego stopami, i dotarł na wysepkę. Na "
            "skinienie istoty stojącej przed nim udał się do")],
    ], size=20, para_gap=0.4, color=STORY, justify=True)

    # RIGHT story column
    p.cover((882, 1122, 1628, 1648), SNOW)
    p.paragraphs((896, 1120, 1614, 1636), [
        [it("środka gwiazdy i ukląkł, zginając swe długie, muskularne nogi. "
            "Natychmiast, w niezmiennym rytmie litanii, postacie owinięte w biel "
            "okrążyły tych dwoje i, z uniesionymi ramionami i dłońmi zwróconymi "
            "w dół, stworzyły rodzaj niewidzialnej bariery. Nagle wody sadzawki "
            "uniosły się, tworząc wąski mur wokół wysepki.")],
        [it("Powietrze zatrzeszczało, jakby przeszył je intensywny prąd "
            "elektryczny, a wtedy przezroczysta istota skręciła się, aż stała "
            "się błyskawicą i uderzyła mężczyznę w pierś. Oczy mężczyzny "
            "nabiegły krwią i przez chwilę zdawały się wychodzić z orbit. Z jego "
            "ust wydobył się rozdzierający krzyk, gdy jego ciało zaczęło się "
            "zmieniać: mięśnie nabrzmiały, urósł, a jego rysy przeobrażały się, "
            "jakby były z gliny. Gdy krzyki ustały, wodny mur magicznie wpłynął "
            "z powrotem do sadzawki, a zamiast mężczyzny stała tam gigantyczna "
            "istota o dokładnie takich samych rysach jak postać, która właśnie "
            "zniknęła.")],
        [it("Pogładził swą długą białą brodę, rozprostował potężne mięśnie i, "
            "spoglądając na istotę obok siebie, rzekł głębokim głosem:")],
        [it("„Jak zawsze, wykonałeś świetną robotę, Hermesie. To gościnne ciało "
            "jest idealne!”.")],
        [it("„Dobrze widzieć cię w ciele, Święty Zeusie!” – ucieszył się jeden "
            "z odzianych w białe szaty, opuszczając krąg.")],
    ], size=20, para_gap=0.4, color=STORY, justify=True)

    out = "/home/user/workt/pl_rulebook/out-01.png"
    p.save(out)
    print("saved", out)

if __name__ == "__main__":
    build()
