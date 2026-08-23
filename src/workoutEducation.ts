export type WorkoutEducation = {
  what: [string, string];
  who: [string, string];
  benefits: [string, string];
  timeline: [string, string];
};

// Tresc oparta na uznanych zrodlach (nie marketingowe obietnice):
// - Kegel: fizjoterapia uroginekologiczna, badania nad dysfunkcjami dna miednicy
// - 4-7-8: technika dr. Andrew Weila, adaptacja pranajamy
// - Oddech uspokajajacy: wydluzony wydech aktywuje uklad przywspolczulny (badania nad HRV)
export const WORKOUT_EDUCATION: Record<string, WorkoutEducation> = {
  'kegel-normal': {
    what: [
      'Napinasz i rozluźniasz mięśnie dna miednicy (te same, którymi zatrzymujesz strumień moczu) w kontrolowanych cyklach.',
      'You tense and release your pelvic floor muscles (the same ones that stop urine flow) in controlled cycles.',
    ],
    who: [
      'Dla każdego, kto chce lepszej kontroli, wytrzymałości i świadomości ciała w sferze seksualnej.',
      'For anyone who wants better control, endurance and body awareness in a sexual context.',
    ],
    benefits: [
      'Silniejsze dno miednicy wiąże się z lepszą kontrolą wytrysku, silniejszymi orgazmami i mniejszym ryzykiem problemów z erekcją związanych z przepływem krwi.',
      'A stronger pelvic floor is linked to better ejaculation control, stronger orgasms, and lower risk of blood-flow-related erection issues.',
    ],
    timeline: [
      'Pierwsze efekty w codziennym funkcjonowaniu zwykle po 4-6 tygodniach regularnego treningu.',
      'First everyday effects usually appear after 4-6 weeks of consistent training.',
    ],
  },
  'kegel-reverse': {
    what: [
      'Świadomie rozluźniasz dno miednicy głębiej niż przy normalnym spoczynku, zamiast je napinać.',
      'You consciously relax your pelvic floor deeper than normal rest, instead of tensing it.',
    ],
    who: [
      'Dla osób z przewlekłym napięciem w miednicy lub tych, którzy już opanowali podstawowy Kegiel i chcą pełnej kontroli w obu kierunkach.',
      'For people with chronic pelvic tension, or those who already master basic Kegels and want full control in both directions.',
    ],
    benefits: [
      'Balansuje napięcie mięśniowe - samo napinanie bez rozluźniania może prowadzić do przewlekłego napięcia i bólu.',
      'Balances muscle tension - squeezing without relaxing can lead to chronic tightness and pain.',
    ],
    timeline: [
      'Umiejętność świadomego rozluźnienia zwykle rozwija się w 2-3 tygodnie.',
      'The skill of conscious relaxation typically develops within 2-3 weeks.',
    ],
  },
  'breathing-calm': {
    what: [
      'Wolny, rytmiczny oddech z wydłużonym wydechem (4s wdech, 6-8s wydech).',
      'Slow, rhythmic breathing with an extended exhale (4s inhale, 6-8s exhale).',
    ],
    who: [
      'Dla każdego, kto chce codziennego narzędzia do regulacji stresu.',
      'For anyone who wants a daily tool for stress regulation.',
    ],
    benefits: [
      'Wydłużony wydech aktywuje układ przywspółczulny (nerw błędny), obniżając tętno i poziom kortyzolu.',
      'An extended exhale activates the parasympathetic nervous system (vagus nerve), lowering heart rate and cortisol.',
    ],
    timeline: [
      'Efekt uspokojenia odczuwalny zwykle już po 1-2 minutach jednej sesji.',
      'A calming effect is usually noticeable after just 1-2 minutes of a single session.',
    ],
  },
  'breathing-4-7-8': {
    what: [
      'Wdech przez nos na 4s, zatrzymanie oddechu na 7s, powolny wydech ustami na 8s. To technika dr. Andrew Weila, oparta na pranajamie.',
      "Inhale through the nose for 4s, hold for 7s, slow exhale through the mouth for 8s. This is Dr. Andrew Weil's technique, based on pranayama.",
    ],
    who: [
      'Dla osób z trudnością w zasypianiu lub nagłymi skokami napięcia/lęku, które chcą szybko się wyciszyć.',
      'For people who struggle falling asleep or experience sudden spikes of tension/anxiety and want to settle quickly.',
    ],
    benefits: [
      'Wydłużone zatrzymanie i wydech silnie pobudzają układ przywspółczulny - wiele osób czuje wyraźne uspokojenie już po pierwszych cyklach.',
      'The extended hold and exhale strongly stimulate the parasympathetic system - many people feel clearly calmer after the first few cycles.',
    ],
    timeline: [
      'Efekt odczuwalny od razu. Przy stosowaniu 2x dziennie, poprawa zasypiania zwykle widoczna po 1-2 tygodniach.',
      'Effect is felt immediately. With 2x daily use, improved sleep onset is typically visible after 1-2 weeks.',
    ],
  },
  'breathing-box': {
    what: [
      'Cztery równe fazy po 4 sekundy: wdech, zatrzymanie, wydech, zatrzymanie. Technika stosowana m.in. przez jednostki wojskowe (Navy SEALs) do szybkiego opanowania stresu pod presją.',
      'Four equal 4-second phases: inhale, hold, exhale, hold. Used by military units (Navy SEALs) to quickly regain control under stress.',
    ],
    who: [
      'Dla osób, które potrzebują szybko "zresetować się" w stresującej sytuacji - przed rozmową, egzaminem, wystąpieniem, albo w trakcie nagłego napięcia.',
      'For people who need to quickly "reset" in a stressful situation - before a conversation, exam, presentation, or during sudden tension.',
    ],
    benefits: [
      'Regularna, symetryczna struktura daje umysłowi jasny punkt skupienia, co odrywa uwagę od źródła stresu i stabilizuje rytm oddechu szybciej niż swobodne oddychanie.',
      'The regular, symmetrical structure gives the mind a clear focal point, pulling attention away from the stressor and stabilizing breathing rhythm faster than free breathing.',
    ],
    timeline: [
      'Efekt zauważalny zwykle po 4-6 pełnych cyklach (ok. 1-1.5 minuty).',
      'Effect is usually noticeable after 4-6 full cycles (about 1-1.5 minutes).',
    ],
  },
};
