import hashlib

from datetime import datetime
from enum import Enum


class ValidCodes(Enum):
    PINGI = 'pingi'
    PINGU = 'pingu'
    EL_BROCCO = 'elbrocco'
    LUSJIFER = 'lusjifer'
    BABUSHKA_RACCOON = 'babushkaraccoon'
    I_LOVE_YOU = 'iloveyou'

    @staticmethod
    def from_string(code: str):
        if isinstance(code, ValidCodes):
            return code
        for c in ValidCodes:
            if code == c.value:
                return c
        raise KeyError(f'{code}')


class Mystery:
    DATE_FORMAT = '%d/%m/%Y %H:%M'
    CODE_UNLOCK_DATES = {
        ValidCodes.EL_BROCCO: datetime.strptime('10/03/2023 10:00', DATE_FORMAT),
        ValidCodes.LUSJIFER: datetime.strptime('17/03/2023 10:00', DATE_FORMAT),
        ValidCodes.BABUSHKA_RACCOON: datetime.strptime('24/03/2023 10:00', DATE_FORMAT),
        ValidCodes.I_LOVE_YOU: datetime.strptime('31/03/2023 10:00', DATE_FORMAT)
    }

    CODE_TITLES = {
        ValidCodes.PINGI: 'Julieveling 😘',
        ValidCodes.PINGU: 'Pingu',
        ValidCodes.EL_BROCCO: 'El Brocco',
        ValidCodes.LUSJIFER: 'Lusjifer',
        ValidCodes.BABUSHKA_RACCOON: 'Raccoon Babushka',
        ValidCodes.I_LOVE_YOU: 'I Love You ❤️'
    }

    @classmethod
    def get_title_for_code(cls, code: str):
        return cls.CODE_TITLES.get(ValidCodes.from_string(code), 'unknown-code')

    @classmethod
    def get_unlock_date_for_code(cls, code: str):
        return cls.CODE_UNLOCK_DATES.get(ValidCodes.from_string(code))

    @classmethod
    def is_valid_code(cls, code: str):
        if not code:
            return False
        try:
            ValidCodes.from_string(code)
        except KeyError:
            return False
        return True

    @classmethod
    def is_unlocked_code(cls, code: str):
        if not cls.is_valid_code(code):
            return False
        now = datetime.now()
        unlock_date = cls.CODE_UNLOCK_DATES.get(ValidCodes.from_string(code), now)
        return unlock_date <= now

    @classmethod
    def get_unlocked_codes(cls):
        result = []
        now = datetime.now()
        for code in ValidCodes:
            date = cls.CODE_UNLOCK_DATES.get(code, now)
            if date <= now:
                result.append(code.value)
        return result


class Riddles:
    ANSWERS_BY_RIDDLE_ID = {
        1: 'potato',
        2: 'silence',
        3: 'e',
        4: 'pingu',
        5: 'teeth'
    }

    @classmethod
    def _hash(cls, text: str):
        return hashlib.sha256(text.encode('utf-8')).hexdigest()

    @classmethod
    def get_answer(cls, riddle_id: int, hash=False):
        answer = cls.ANSWERS_BY_RIDDLE_ID[riddle_id]
        if hash:
            answer = cls._hash(answer)
        return answer

    @classmethod
    def get_all_answers(cls, hash=False):
        return [cls._hash(v) if hash else v for _, v in cls.ANSWERS_BY_RIDDLE_ID.items()]


class Hints:
    HINTS = {
        'initial': 'Make sure to read every letter carefully.<br>Especially those that start a sentence.',
        ValidCodes.EL_BROCCO: 'You won\'t find anything sitting around like that.<br>Better get moving and start looking around!',
        ValidCodes.BABUSHKA_RACCOON: 'In order to proceed, remember your ABCs.<br>Then you\'ll see just as quickly as 1 2 3.'
    }

    @classmethod
    def get_hint(cls, code: str):
        return cls.HINTS.get(code if code == 'initial' else ValidCodes.from_string(code))
