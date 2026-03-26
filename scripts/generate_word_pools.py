#!/usr/bin/env python3
"""Generate curated local word pools for the browser word game.

This script favors standard modern English over raw dictionary coverage.
It merges a few high-frequency sources, filters them against lexical and
quality rules, and writes packed per-length TypeScript modules.
"""

from __future__ import annotations

import csv
import re
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Final
from urllib.request import urlopen

try:
    from wordfreq import top_n_list, zipf_frequency
except ModuleNotFoundError as exc:  # pragma: no cover - developer script
    raise SystemExit(
        'Missing "wordfreq". Install it with: python3 -m pip install --user wordfreq nltk'
    ) from exc

try:
    import nltk
    from nltk.corpus import wordnet as wn
except ModuleNotFoundError as exc:  # pragma: no cover - developer script
    raise SystemExit(
        'Missing "nltk". Install it with: python3 -m pip install --user wordfreq nltk'
    ) from exc


ASCII_WORD: Final[re.Pattern[str]] = re.compile(r'^[a-z]+$')
MIN_WORD_LENGTH: Final[int] = 3
MAX_WORD_LENGTH: Final[int] = 10
ANSWER_TARGET: Final[int] = 500
COMMON_TARGET: Final[int] = 200
ALLOWED_GUESS_TARGETS: Final[dict[int, int]] = {
    3: 500,
    4: 650,
    5: 650,
    6: 650,
    7: 650,
    8: 650,
    9: 650,
    10: 650,
}
SOURCE_LIMITS: Final[dict[str, int]] = {
    'wordfreq': 120_000,
    'google20k': 20_000,
    'hermit50k': 50_000,
}
SOURCE_URLS: Final[dict[str, str]] = {
    'google20k': 'https://raw.githubusercontent.com/first20hours/google-10000-english/master/20k.txt',
    'hermit50k': 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/en/en_50k.txt',
    'countries': 'https://raw.githubusercontent.com/umpirsky/country-list/master/data/en/country.txt',
    'states': 'https://raw.githubusercontent.com/jasonong/List-of-US-States/master/states.csv',
    'first_names': 'https://raw.githubusercontent.com/smashew/NameDatabases/master/NamesDatabases/first%20names/all.txt',
    'surnames': 'https://raw.githubusercontent.com/smashew/NameDatabases/master/NamesDatabases/surnames/all.txt',
}

STOPWORDS: Final[set[str]] = {
    'a', 'after', 'again', 'all', 'an', 'and', 'any', 'are', 'as', 'at',
    'be', 'been', 'before', 'being', 'both', 'but', 'by', 'can', 'could',
    'did', 'do', 'does', 'doing', 'done', 'each', 'ever', 'few', 'for',
    'from', 'further', 'had', 'has', 'have', 'he', 'her', 'here', 'hers',
    'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into',
    'is', 'it', 'its', 'itself', 'just', 'let', 'less', 'many', 'may',
    'me', 'more', 'most', 'much', 'must', 'my', 'myself', 'no', 'not',
    'now', 'of', 'off', 'on', 'once', 'one', 'only', 'or', 'other', 'our',
    'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should',
    'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them',
    'themselves', 'then', 'there', 'these', 'they', 'this', 'those',
    'through', 'to', 'too', 'under', 'until', 'up', 'upon', 'us', 'very',
    'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who',
    'whom', 'why', 'will', 'with', 'would', 'yet', 'you', 'your', 'yours',
    'yourself', 'yourselves',
}
MONTHS_AND_DAYS: Final[set[str]] = {
    'april', 'august', 'december', 'february', 'friday', 'january', 'july',
    'june', 'march', 'monday', 'november', 'october', 'saturday',
    'september', 'sunday', 'thursday', 'tuesday', 'wednesday',
}
DEMONYMS: Final[set[str]] = {
    'african', 'american', 'australian', 'brazilian', 'british', 'canadian',
    'chinese', 'danish', 'dutch', 'egyptian', 'european', 'finnish',
    'french', 'greek', 'indian', 'indonesian', 'irish', 'israeli',
    'italian', 'japanese', 'korean', 'mexican', 'norwegian', 'polish',
    'portuguese', 'russian', 'scottish', 'spanish', 'swedish', 'turkish',
    'ukrainian', 'welsh',
}
APOSTROPHE_DROPS: Final[set[str]] = {
    'arent', 'cant', 'couldnt', 'didnt', 'doesnt', 'dont', 'goin', 'gonna',
    'gotta', 'hadnt', 'hasnt', 'havent', 'heres', 'id', 'ill', 'im',
    'isnt', 'ive', 'lets', 'shouldnt', 'thats', 'theres', 'theyll',
    'theyre', 'theyve', 'wanna', 'wasnt', 'weve', 'well', 'werent',
    'whats', 'wont', 'wouldnt', 'youll', 'youre', 'youve',
}
PROFANITY_AND_LOW_POLISH: Final[set[str]] = {
    'anal', 'ass', 'bitch', 'bloody', 'cunt', 'damn', 'fucked', 'fucking',
    'idiot', 'jerk', 'nude', 'pissed', 'racist', 'raped', 'sex', 'shit',
    'slut', 'tits',
}
QUALITY_BLOCKLIST: Final[set[str]] = {
    'afc', 'aka', 'android', 'apps', 'apr', 'aug', 'basketball', 'batman',
    'blackberry', 'bluetooth', 'brooklyn', 'cambridge', 'ceo', 'christ',
    'cincinnati', 'cleveland', 'damn', 'dec', 'delhi', 'democrat',
    'democrats', 'dna', 'ebay', 'edinburgh', 'etc', 'fbi', 'feb',
    'football', 'francisco', 'fri', 'gaza', 'gmail', 'god', 'gta', 'hbo',
    'halloween', 'html', 'http', 'icu', 'inc', 'intel', 'ios', 'ipod',
    'islamic', 'java', 'jerusalem', 'jew', 'lol', 'louisville',
    'manchester', 'melbourne', 'microsoft', 'moscow', 'muslim', 'muslims',
    'newcastle', 'nhl', 'nike', 'nintendo', 'non', 'nov', 'oct', 'oxford',
    'pga', 'pittsburgh', 'racism', 'republican', 'sacramento', 'samsung',
    'seattle', 'shanghai', 'socialism', 'superman', 'sweden', 'terror',
    'thailand', 'tho', 'tokyo', 'tue', 'uae', 'ukrainian', 'ups', 'usb',
    'usa',
    'vancouver', 'wed', 'wifi', 'wwe', 'youtube', 'yorkshire', 'holocaust',
    'azo', 'bap', 'bpi', 'emf', 'erg', 'ern', 'gib', 'hin', 'hie', 'kea',
    'khi', 'kob', 'kor', 'lav', 'lek', 'lii', 'meq', 'qat', 'rho', 'soh',
    'uke', 'waw', 'wog', 'yid', 'yob',
}
SHORT_FORM_BLOCKLIST: Final[set[str]] = {
    'afl', 'aka', 'att', 'biz', 'bro', 'ceo', 'cfo', 'cgi', 'cio', 'cpa',
    'cpu', 'css', 'dev', 'dvd', 'epa', 'faq', 'fbi', 'fda', 'gop', 'gps',
    'gui', 'hbo', 'hiv', 'icu', 'idc', 'imo', 'inc', 'ios', 'isp', 'irs',
    'jpg', 'kde', 'lol', 'mri', 'nba', 'nfl', 'nhl', 'oem', 'omg', 'pdf',
    'php', 'png', 'pos', 'psu', 'sql', 'url', 'usb', 'usd', 'usr', 'utc',
    'vip', 'wto', 'www', 'xml',
}
Y_ONLY_ALLOWLIST: Final[set[str]] = {'cry', 'dry', 'fly', 'fry', 'gym', 'myth', 'shy', 'sky', 'try', 'wry'}

THREE_LETTER_PRIORITY_WORDS: Final[list[str]] = [
    'get', 'new', 'two', 'way', 'say', 'use', 'end', 'big', 'put', 'top',
    'bad', 'job', 'try', 'run', 'law', 'war', 'car', 'ago', 'guy', 'pay',
    'win', 'air', 'bit', 'hit', 'ask', 'buy', 'age', 'red', 'act', 'fun',
    'art', 'six', 'cut', 'boy', 'hot', 'tax', 'eat', 'key', 'mom', 'cup',
    'dog', 'oil', 'add', 'met', 'bed', 'die', 'sea', 'sir', 'ten', 'box',
    'eye', 'gas', 'ice', 'kid', 'sun', 'gun', 'dad', 'fit', 'bar', 'fan',
    'sit', 'pop', 'ran', 'fat', 'lie', 'sad', 'mid', 'van', 'map', 'fly',
    'dry', 'mad', 'arm', 'sky', 'ray', 'sub', 'leg', 'row', 'cry', 'joy',
    'tip', 'wet', 'hat', 'raw', 'fee', 'aim', 'tie', 'rid', 'gap', 'hip',
    'pet', 'tag', 'ear', 'gym', 'lab', 'bid', 'pot', 'bye', 'log', 'cop',
    'doc', 'toy', 'bow', 'jet', 'tap', 'pit', 'rip', 'dig', 'bug', 'oak',
    'pig', 'ski', 'lip', 'mud', 'ham', 'ace', 'fig', 'hub', 'ink', 'toe',
    'beg', 'mob', 'ego', 'den', 'pad', 'spa', 'flu', 'cab', 'jar', 'wax',
    'fry', 'gem', 'owl', 'ant', 'ape', 'ark', 'ash', 'axe', 'bag', 'ban',
    'bat', 'bay', 'bee', 'bin', 'bog', 'bun', 'bus', 'cat', 'cod', 'cog',
    'cot', 'cow', 'cub', 'dip', 'dot', 'dug', 'dye', 'eel', 'egg', 'elf',
    'elm', 'era', 'fox', 'fur', 'gel', 'gum', 'gut', 'hen', 'hop', 'hug',
    'hut', 'kit', 'lap', 'lid', 'lob', 'lug', 'mug', 'nap', 'net', 'nod',
    'nut', 'peg', 'pen', 'pin', 'rib', 'rod', 'rug', 'sap', 'sip', 'sob',
    'tab', 'tan', 'tar', 'tin', 'ton', 'tub', 'urn', 'vet', 'wig', 'yak',
    'yam', 'yap', 'yaw', 'yew', 'zap', 'zen', 'zoo', 'ale', 'apt', 'arc',
    'awe', 'awl', 'bud', 'cap', 'cob', 'coy', 'cue', 'dew', 'dim', 'din',
    'doe', 'ewe', 'fir', 'foe', 'gin', 'ire', 'kin', 'lad', 'lop', 'maw',
    'oat', 'ore', 'paw', 'pea', 'pew', 'pod', 'pug', 'ram', 'rat', 'rye',
    'sow', 'sty', 'tug', 'vat', 'vow', 'woo', 'ado', 'boa', 'emu', 'fad',
    'hew', 'hog', 'man', 'oar', 'odd', 'pie', 'rum', 'tea', 'hay', 'see',
    'old', 'set', 'lot', 'low', 'due', 'son', 'day', 'per', 'sum', 'hey',
    'aid', 'nor', 'owe', 'via', 'yet',
]

COMMON_GUESS_ONLY_WORDS_BY_LENGTH: Final[dict[int, list[str]]] = {
    3: [
        'the', 'and', 'for', 'you', 'was', 'are', 'not', 'but', 'all', 'his',
        'can', 'out', 'has', 'who', 'had', 'her', 'she', 'how', 'now', 'its',
        'our', 'him', 'any', 'may', 'did', 'too', 'off', 'why', 'own', 'few',
    ],
    4: [
        'that', 'with', 'this', 'have', 'from', 'your', 'they', 'will', 'just',
        'what', 'when', 'more', 'were', 'been', 'some', 'also', 'them', 'than',
        'only', 'into', 'over', 'then', 'most', 'very', 'here', 'down', 'such',
        'same', 'both', 'does', 'each', 'must', 'ever', 'once', 'upon',
    ],
    5: ['their', 'there', 'which', 'would', 'other', 'after', 'could', 'these', 'where', 'being'],
    6: ['should', 'before', 'during', 'having', 'myself', 'itself', 'slowly'],
}
THREE_LETTER_COMMON_ANSWER_WORDS: Final[list[str]] = COMMON_GUESS_ONLY_WORDS_BY_LENGTH[3]


@dataclass(frozen=True, slots=True)
class WordRecord:
    sources: frozenset[str]
    ranks: dict[str, int]
    zipf: float


def ensure_wordnet() -> None:
    """Download WordNet data when a local developer machine lacks it."""
    try:
        wn.ensure_loaded()
    except LookupError:  # pragma: no cover - developer script
        nltk.download('wordnet', quiet=True)
        nltk.download('omw-1.4', quiet=True)
        wn.ensure_loaded()


@lru_cache(maxsize=None)
def fetch_text(url: str) -> str:
    with urlopen(url) as response:  # noqa: S310 - controlled source list
        return response.read().decode('utf-8')


def parse_simple_list(url: str) -> list[str]:
    return [normalize_word(line) for line in fetch_text(url).splitlines() if normalize_word(line)]


def parse_hermit_words(url: str) -> list[str]:
    words: list[str] = []
    for line in fetch_text(url).splitlines():
        parts = line.split(' ')
        if len(parts) < 2:
            continue

        normalized = normalize_word(parts[1])
        if normalized:
            words.append(normalized)

    return words


def parse_state_names(url: str) -> list[str]:
    states: list[str] = []
    for row in csv.DictReader(fetch_text(url).splitlines()):
        normalized = normalize_word(row.get('State', ''))
        if normalized:
            states.append(normalized)

    return states


def normalize_word(raw_word: str) -> str:
    return raw_word.strip().lower()


def has_standard_vowel(word: str) -> bool:
    return any(letter in 'aeiou' for letter in word)


@lru_cache(maxsize=None)
def has_lowercase_lemma(word: str) -> bool:
    return any(lemma.name() == word for synset in wn.synsets(word) for lemma in synset.lemmas())


def build_source_words() -> dict[str, list[str]]:
    return {
        'wordfreq': [normalize_word(word) for word in top_n_list('en', SOURCE_LIMITS['wordfreq'], wordlist='best')],
        'google20k': parse_simple_list(SOURCE_URLS['google20k']),
        'hermit50k': parse_hermit_words(SOURCE_URLS['hermit50k']),
    }


def build_word_records(source_words: dict[str, list[str]]) -> dict[str, WordRecord]:
    records: dict[str, WordRecord] = {}

    for source_name, words in source_words.items():
        for rank, word in enumerate(words, start=1):
            if word not in records:
                records[word] = WordRecord(frozenset(), {}, zipf_frequency(word, 'en'))

            current = records[word]
            new_ranks = dict(current.ranks)
            new_ranks[source_name] = rank
            records[word] = WordRecord(current.sources | {source_name}, new_ranks, current.zipf)

    for word in THREE_LETTER_PRIORITY_WORDS:
        records.setdefault(word, WordRecord(frozenset(), {}, zipf_frequency(word, 'en')))

    return records


def build_name_blocklist() -> set[str]:
    return set(parse_simple_list(SOURCE_URLS['first_names'])) | set(parse_simple_list(SOURCE_URLS['surnames']))


def build_place_blocklist() -> set[str]:
    return (
        set(parse_simple_list(SOURCE_URLS['countries'])) |
        set(parse_state_names(SOURCE_URLS['states'])) |
        MONTHS_AND_DAYS |
        DEMONYMS
    )


def is_base_quality_word(
    word: str,
    place_blocklist: set[str],
    name_blocklist: set[str],
    priority_words: set[str],
) -> bool:
    if len(word) < MIN_WORD_LENGTH or len(word) > MAX_WORD_LENGTH:
        return False

    if not ASCII_WORD.fullmatch(word):
        return False

    if word in APOSTROPHE_DROPS or word in PROFANITY_AND_LOW_POLISH or word in QUALITY_BLOCKLIST:
        return False

    if len(word) <= 3 and word in SHORT_FORM_BLOCKLIST:
        return False

    if word in place_blocklist and word not in priority_words:
        return False

    if word in name_blocklist and word not in priority_words:
        return False

    if not has_standard_vowel(word) and word not in Y_ONLY_ALLOWLIST and word not in priority_words:
        return False

    return True


def score_word(word: str, record: WordRecord) -> tuple[int, int, float, int, str]:
    best_rank = min(record.ranks.values()) if record.ranks else 999_999
    return (
        len(record.sources),
        1 if 'google20k' in record.sources else 0,
        record.zipf,
        -best_rank,
        word,
    )


def unique_words(words: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    ordered_words: list[str] = []

    for word in words:
        if word in seen:
            continue

        seen.add(word)
        ordered_words.append(word)

    return ordered_words


def take_words(words: Sequence[str], target: int, label: str) -> list[str]:
    if len(words) < target:
        raise SystemExit(f'Not enough {label} words. Needed {target}, found {len(words)}.')

    return list(words[:target])


def format_word_lines(words: Sequence[str], words_per_line: int = 20) -> list[str]:
    return [
        ' '.join(words[index:index + words_per_line])
        for index in range(0, len(words), words_per_line)
    ]


def build_word_pack_module(
    word_length: int,
    answer_words: Sequence[str],
    allowed_guess_words: Sequence[str],
) -> str:
    answer_lines = format_word_lines(answer_words)
    guess_lines = format_word_lines(allowed_guess_words)

    answer_block = '\n'.join(f"    '{line}'," for line in answer_lines)
    guess_block = '\n'.join(f"    '{line}'," for line in guess_lines)

    return (
        "import type { PackedWordPool } from './shared';\n\n"
        "export const WORD_POOL_PACK: PackedWordPool = {\n"
        f'  commonCount: {COMMON_TARGET},\n'
        f'  standardCount: {len(answer_words)},\n'
        "  answerWords: [\n"
        f'{answer_block}\n'
        "  ].join(' '),\n"
        "  allowedGuessWords: [\n"
        f'{guess_block}\n'
        "  ].join(' ')\n"
        "};\n"
    )


def write_word_pool_file(word_length: int, module_contents: str) -> None:
    output_path = Path('src/js/data/wordPools') / f'length{word_length}.ts'
    output_path.write_text(module_contents, encoding='utf-8')


def main() -> None:
    ensure_wordnet()

    source_words = build_source_words()
    word_records = build_word_records(source_words)
    name_blocklist = build_name_blocklist()
    place_blocklist = build_place_blocklist()
    three_letter_priority = set(THREE_LETTER_PRIORITY_WORDS)

    for word_length in range(MIN_WORD_LENGTH, MAX_WORD_LENGTH + 1):
        priority_answer_words = (
            THREE_LETTER_PRIORITY_WORDS + THREE_LETTER_COMMON_ANSWER_WORDS
            if word_length == 3
            else []
        )
        priority_guess_words = priority_answer_words + COMMON_GUESS_ONLY_WORDS_BY_LENGTH.get(word_length, [])

        base_candidates = [
            word
            for word, record in word_records.items()
            if len(word) == word_length and is_base_quality_word(
                word,
                place_blocklist,
                name_blocklist,
                three_letter_priority,
            )
        ]

        answer_candidates = [
            word
            for word in base_candidates
            if word not in STOPWORDS and (
                word in three_letter_priority or has_lowercase_lemma(word)
            )
        ]
        guess_candidates = [
            word
            for word in base_candidates
            if word in three_letter_priority or has_lowercase_lemma(word)
        ]

        sorted_answer_candidates = sorted(
            answer_candidates,
            key=lambda word: score_word(word, word_records[word]),
            reverse=True,
        )
        sorted_guess_candidates = sorted(
            guess_candidates,
            key=lambda word: score_word(word, word_records[word]),
            reverse=True,
        )

        ordered_answers = unique_words(priority_answer_words + sorted_answer_candidates)
        ordered_guesses = unique_words(priority_guess_words + ordered_answers + sorted_guess_candidates)

        selected_answers = take_words(
            ordered_answers,
            ANSWER_TARGET,
            f'{word_length}-letter answer',
        )
        selected_guesses = take_words(
            ordered_guesses,
            ALLOWED_GUESS_TARGETS[word_length],
            f'{word_length}-letter guess',
        )

        module_contents = build_word_pack_module(word_length, selected_answers, selected_guesses)
        write_word_pool_file(word_length, module_contents)

        tail_preview = ', '.join(selected_answers[-10:])
        print(
            f'{word_length}-letter: {len(selected_answers)} answers, '
            f'{len(selected_guesses)} guesses. Tail preview: {tail_preview}'
        )


if __name__ == '__main__':
    main()
