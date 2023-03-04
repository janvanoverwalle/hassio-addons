window.onload = (event) => {
    if (!window.location.pathname.startsWith('/mystery')) {
        return;
    }

    handle_used_codes();

    if (document.getElementById('form-code')) {
        handle_form_validation();
    }

    if (document.getElementById('riddle-container')) {
        _fetch_all_answers();
        _handle_solved_riddles();
        return;
    }

    if (document.getElementById('sliding-puzzle-figure-container')) {
        sliding_puzzle_game();
        return;
    }
}

//#region Flip cards
function flipCard(degrees) {
    if (degrees === undefined) {
        degrees = 180;
    }
    var elements = document.getElementsByClassName('flip-box-inner');
    elements[0].style.webkitTransform = 'rotateY(' + degrees + 'deg)';
}

function addFlipCardEventListeners(duration) {
    if (duration) {
        var innerElements = document.getElementsByClassName('flip-box-inner');
        innerElements[0].style.transitionDuration = duration + 's';
    }

    var frontElements = document.getElementsByClassName('flip-box-front');
    frontElements[0].addEventListener('click', () => flipCard(180), true);

    var backElements = document.getElementsByClassName('flip-box-back');
    backElements[0].addEventListener('click', () => flipCard(0), true);
}
//#endregion

//#region Code validation
function handle_form_validation() {
    document.getElementById('button-submit').addEventListener('click', _validate_mystery_code, true);
    document.getElementById('input_code').addEventListener('input', _clear_code_formatting, true);
}

function _validate_mystery_code(event) {
    event.preventDefault();

    var input = document.getElementById('input_code');
    _validate_code(input.value)
        .then(is_valid => {
            if (is_valid) {
                document.getElementById('form-code').submit();
            }
            else {
                _mark_code_as_incorrect(input);
            }
        });
}

function _clear_code_formatting(event) {
    input = document.getElementById('input_code');
    input.classList.remove('text-danger', 'code-incorrect');
}

function _mark_code_as_incorrect(input) {
    if (input === undefined) {
        input = document.getElementById('input_code');
    }
    input.classList.add('text-danger', 'code-incorrect');
    input.select();
}

async function _validate_code(code) {
    const response = await fetch(document.location.origin + '/api/mystery/validate-code', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8'
        },
        body: JSON.stringify({
            code: code
        })
    });
    const json = await response.json();
    return json.is_valid;
}
//#endregion

//#region Used codes
function clear_used_codes() {
    localStorage.removeItem('used_codes');

    const el = document.getElementById('used-codes-container');
    if (el) {
        el.remove();
    }
}

function handle_used_codes() {
    const mystery_code = document.getElementById('mystery-code');
    if (mystery_code) {
        handle_new_code(mystery_code.textContent);
    }

    const container = document.getElementById('used-codes-list');
    if (container) {
        handle_used_codes_list(container);
    }
}

function handle_new_code(code) {
    var used_codes = localStorage.getItem('used_codes');
    used_codes = used_codes ? JSON.parse(used_codes) : [];

    if (!used_codes.includes(code)) {
        used_codes.push(code);
    }

    localStorage.setItem('used_codes', JSON.stringify(used_codes));
}

function handle_used_codes_list(container) {
    var used_codes = localStorage.getItem('used_codes');
    if (!used_codes) {
        const el = document.getElementById('used-codes-container');
        if (el) {
            el.remove();
        }
        return;
    }

    used_codes = JSON.parse(used_codes);
    //used_codes.sort();
    for (code of used_codes) {
        const span = document.createElement('span');
        span.classList.add('mystery-code');
        span.textContent = code;

        const a = document.createElement('a');
        a.classList.add('ml-4', 'h5');
        a.href = '/mystery/' + code;
        a.appendChild(span);

        const li = document.createElement('li');
        li.classList.add('mt-2');
        li.appendChild(a);

        container.appendChild(li);
    }

    const el = document.getElementById('used-codes-container');
    if (el) {
        el.classList.remove('invisible');
    }
}
//#endregion

//#region Hints
function reveal_hint(sender) {
    _fetch_hint(sender.value)
        .then(hint => {
            const parent = sender.parentElement;
            sender.remove();
            const p = document.createElement('p');
            p.classList.add('text-center');
            p.innerHTML = hint;
            parent.appendChild(p);
        });
}

async function _fetch_hint(value) {
    const response = await fetch(document.location.origin + '/api/mystery/hints/' + value, {
        headers: {
            'Content-Type': 'application/json; charset=UTF-8'
        }
    });
    const json = await response.json();
    return json.hint;
}
//#endregion

//#region Riddles
var correct_answers = [];
var incorrect_timeout = undefined;

async function _fetch_all_answers() {
    const response = await fetch(document.location.origin + '/api/mystery/riddles', {
        headers: {
            'Content-Type': 'application/json; charset=UTF-8'
        }
    });
    const json = await response.json();
    correct_answers = json.answers;
    return correct_answers;
}

function _get_solved_riddles() {
    var solved_riddles = localStorage.getItem('solved_riddles');
    return solved_riddles ? JSON.parse(solved_riddles) : [];
}

function _handle_solved_riddles() {
    document.getElementById('container-riddle-1').classList.remove('invisible');

    var solved_riddles = _get_solved_riddles();
    if (!solved_riddles || solved_riddles.length < 1) {
        document.getElementById('input_riddle_1').focus();
        return;
    }

    for (riddle of solved_riddles) {
        var input = document.getElementById('input_riddle_' + riddle.id);
        input.value = riddle.answer;
        _mark_riddle_as_correct(input);
        _next_riddle(input, 3000);
    }
}

async function _hash(text) {
    const text_as_buffer = new TextEncoder().encode(text);
    const hash_buffer = await window.crypto.subtle.digest('SHA-256', text_as_buffer);
    const hash_array = Array.from(new Uint8Array(hash_buffer));
    const digest = hash_array.map(b => b.toString(16).padStart(2, '0')).join('');
    return digest;
}

function on_riddle_input_change(sender) {
    if (!sender.value) {
        sender.classList.remove('text-danger', 'riddle-incorrect');
        if (incorrect_timeout) {
            clearTimeout(incorrect_timeout);
        }
        return;
    }

    var riddle_id = parseInt(sender.name.split('_').pop());
    _hash(sender.value.toLowerCase())
        .then(hash => _handle_answer(sender, hash, correct_answers[riddle_id-1]));
}

function _handle_answer(sender, user_answer, correct_answer) {
    if (incorrect_timeout) {
        clearTimeout(incorrect_timeout);
    }

    if (user_answer != correct_answer) {
        _mark_riddle_as_incorrect(sender);
        return;
    }

    _mark_riddle_as_correct(sender);
    _record_solved_riddle(sender);
    setTimeout(() => _next_riddle(sender), 1000);
}

function _mark_riddle_as_incorrect(input, timeout) {
    timeout = timeout === undefined ? 3000 : timeout;
    input.classList.add('text-danger', 'riddle-incorrect');
    incorrect_timeout = setTimeout(() => input.classList.remove('text-danger', 'riddle-incorrect'), timeout);
}

function _mark_riddle_as_correct(input) {
    document.activeElement.blur();

    input.setAttribute('readonly', '');
    input.classList.remove('text-danger', 'riddle-incorrect');
    input.classList.add('text-success', 'riddle-correct');
}

function _show_riddle(riddle_id) {
    var container = document.getElementById('container-riddle-' + riddle_id);
    container.classList.remove('invisible');

    document.getElementById('input_riddle_' + riddle_id).focus();
}

function _record_solved_riddle(input) {
    var solved_riddles = _get_solved_riddles();
    if (!solved_riddles.includes(riddle_id)) {
        var riddle_id = input.name.split('_').pop();
        solved_riddles.push({id: riddle_id, answer: input.value});
        localStorage.setItem('solved_riddles', JSON.stringify(solved_riddles));
    }
}

function _next_riddle(current_riddle_input, timeout) {
    var current_riddle_id = current_riddle_input.name.split('_').pop();
    var container = document.getElementById('riddle-' + current_riddle_id);
    var next_riddle_id = container.getAttribute('next');
    if (!next_riddle_id) {
        _handle_all_riddles_solved(timeout);
        return;
    }

    _show_riddle(next_riddle_id);
}

function _handle_all_riddles_solved(timeout) {
    console.log('All riddles solved!');
    addFlipCardEventListeners();
    if (timeout === undefined) {
        timeout = 0;
    }
    setTimeout(() => flipCard(180), timeout);
}

function reset_riddles() {
    localStorage.removeItem('solved_riddles');
    document.location.reload();
}
//#endregion

//#region Sliding puzzle
function sliding_puzzle_game() {
    // Source: https://github.com/danishmughal/sliding-puzzle

    // Data structure to hold positions of tiles
    var parentX = document.querySelector('.sliding-puzzle').clientHeight;
    var baseDistance = 33.8;
    var tileMap = {
        1: {
            tileNumber: 1,
            position: 1,
            top: 0,
            left: 0
        },
        2: {
            tileNumber: 2,
            position: 2,
            top: 0,
            left: baseDistance * 1
        },
        empty: {
            tileNumber: 3,
            position: 3,
            top: 0,
            left: baseDistance * 2
        },
        4: {
            tileNumber: 4,
            position: 4,
            top: baseDistance,
            left: 0
        },
        5: {
            tileNumber: 5,
            position: 5,
            top: baseDistance,
            left: baseDistance
        },
        6: {
            tileNumber: 6,
            position: 6,
            top: baseDistance,
            left: baseDistance * 2
        },
        7: {
            tileNumber: 7,
            position: 7,
            top: baseDistance * 2,
            left: 0
        },
        8: {
            tileNumber: 8,
            position: 8,
            top: baseDistance * 2,
            left: baseDistance
        },
        9: {
            tileNumber: 9,
            position: 9,
            top: baseDistance * 2,
            left: baseDistance * 2
        }
    }

    // Array of tileNumbers in order of last moved
    var history = [];

    // Movement map
    function movementMap(position) {
        if (position == 9) return [6, 8];
        if (position == 8) return [5, 7, 9];
        if (position == 7) return [4, 8];
        if (position == 6) return [3, 5, 9];
        if (position == 5) return [2, 4, 6, 8];
        if (position == 4) return [1, 5, 7];
        if (position == 3) return [2, 6];
        if (position == 2) return [1, 3, 5];
        if (position == 1) return [2, 4];
    }

    document.getElementById('reset-slider').addEventListener('click', () => {
        localStorage.removeItem('slider_solved');
        document.location.reload();
    }, true);

    // Board setup according to the tileMap
    document.querySelector('#shuffle').addEventListener('click', shuffle, true);
    document.querySelector('#solve').addEventListener('click', solve, true);
    var slider_solved = localStorage.getItem('slider_solved') === 'true';
    if (!slider_solved) {
        document.querySelector('.tile-' + tileMap.empty.tileNumber).remove();
    }
    var tiles = document.querySelectorAll('.tile');
    var delay = 0;
    for (var i = 0; i < tiles.length; i++) {
        if (slider_solved) {
            tiles[i].style.cursor = 'default';
        }
        else {
            tiles[i].addEventListener('click', tileClicked, true);
        }

        setTimeout(setup, delay, tiles[i]);
        if (!slider_solved) {
            delay += 50;
        }
    }

    if (slider_solved) {
        addFlipCardEventListeners(2);
    }
    else {
        setTimeout(shuffle, delay, 30);
    }

    function setup(tile) {
        var tileId = tile.getAttribute('value');
        if (tileId == '3') {
            tileId = 'empty';
        }
        // tile.style.left = tileMap[tileId].left + '%';
        // tile.style.top = tileMap[tileId].top + '%';
        var factor = 100;
        var xMovement = parentX * (tileMap[tileId].left / factor);
        var yMovement = parentX * (tileMap[tileId].top / factor);
        var translateString = 'translateX(' + xMovement + 'px) ' + 'translateY(' + yMovement + 'px)'
        tile.style.webkitTransform = translateString;
        recolorTile(tile, tileId);
    }

    function tileClicked(event) {
        if (localStorage.getItem('slider_solved') === 'true') {
            return;
        }

        moveTile(event.target);

        if (checkSolution()) {
            puzzleSolved();
        }
    }

    function puzzleSolved(timeout) {
        if (localStorage.getItem('slider_solved') === 'true') {
            return;
        }

        var li = document.createElement('li');
        li.classList.add('tile', 'tile-3');
        li.setAttribute('value', '3');
        li.style.transitionDuration = '2s';
        var ul = document.querySelector('.tile-2').parentElement;
        ul.insertBefore(li, ul.children[0]);
        setTimeout(setup, 100, li);

        var tiles = document.querySelectorAll('.tile');
        for (var i = 0; i < tiles.length; i++) {
            tiles[i].removeEventListener('click', tileClicked);
            tiles[i].style.cursor = 'default';
        };

        timeout = timeout === undefined ? 500 : timeout;
        setTimeout(() => {
            document.getElementById('audio-player').play();
        }, timeout);

        setTimeout(() => flipCard(180), timeout + 10000);
        setTimeout(() => addFlipCardEventListeners(2), timeout + 15000);

        localStorage.setItem('slider_solved', 'true');
    }

    // Moves tile to empty spot
    // Returns error message if tile cannot be moved
    function moveTile(tile, recordHistory = true) {
        // Check if Tile can be moved 
        // (must be touching empty tile)
        // (must be directly perpendicular to empty tile)
        var tileNumber = tile.getAttribute('value');
        if (!tileMovable(tileNumber)) {
            console.log('Tile ' + tileNumber + ' can\'t be moved.');
            return;
        }

        // Push to history
        if (recordHistory == true) {
            if (history.length >= 3) {
                if (history[history.length - 1] != history[history.length - 3]) {
                    history.push(tileNumber);
                }
            } else {
                history.push(tileNumber);
            }
        }

        // Swap tile with empty tile
        var emptyTop = tileMap.empty.top;
        var emptyLeft = tileMap.empty.left;
        var emptyPosition = tileMap.empty.position;
        tileMap.empty.top = tileMap[tileNumber].top;
        tileMap.empty.left = tileMap[tileNumber].left;
        tileMap.empty.position = tileMap[tileNumber].position;

        // tile.style.top = emptyTop  + '%'; 
        // tile.style.left = emptyLeft  + '%';

        var factor = 100;
        var xMovement = parentX * (emptyLeft / factor);
        var yMovement = parentX * (emptyTop / factor);
        var translateString = 'translateX(' + xMovement + 'px) ' + 'translateY(' + yMovement + 'px)';
        tile.style.webkitTransform = translateString;

        tileMap[tileNumber].top = emptyTop;
        tileMap[tileNumber].left = emptyLeft;
        tileMap[tileNumber].position = emptyPosition;

        recolorTile(tile, tileNumber);
    }

    // Determines whether a given tile can be moved
    function tileMovable(tileNumber) {
        var selectedTile = tileMap[tileNumber];
        var emptyTile = tileMap.empty;
        var movableTiles = movementMap(emptyTile.position);
        return movableTiles.includes(selectedTile.position);
    }

    // Returns true/false based on if the puzzle has been solved
    function checkSolution() {
        if (tileMap.empty.position !== 3) {
            return false;
        }

        for (var key in tileMap) {
            if (key == 1 || key == 9) {
                continue;
            }

            var prevKey = key == 4 ? 'empty' : key == 'empty' ? 2 : key - 1;
            if (tileMap[key].position < tileMap[prevKey].position) {
                return false;
            }
        }

        // Clear history if solved
        history = [];
        return true;
    }

    // Check if tile is in correct place!
    function recolorTile(tile, tileId) {
        if (tileId == tileMap[tileId].position) {
            tile.classList.remove('error');
        } else {
            tile.classList.add('error');
        }
    }

    // Shuffles the current tiles
    shuffleTimeouts = [];
    function shuffle(iterations) {
        clearTimers(shuffleTimeouts);

        var durations = [];
        tiles.forEach(t => {
            durations.push(t.style.transitionDuration);
            t.style.transitionDuration = '10ms';
        })
        clearTimers(solveTimeouts);
        shuffleLoop();

        iterations = iterations === undefined ? 20 : iterations;
        var shuffleStep = 100;
        var shuffleDelay = shuffleStep;
        var shuffleCounter = 0;
        while (shuffleCounter < iterations) {
            shuffleDelay += shuffleStep;
            shuffleTimeouts.push(setTimeout(shuffleLoop, shuffleDelay));
            shuffleCounter++;
        }

        setTimeout(() => {
            durations.reverse();
            tiles.forEach(t => {
                t.style.transitionDuration = durations.pop();
            })
        }, shuffleDelay + shuffleStep);
    }

    var lastShuffled;

    function shuffleLoop() {
        var emptyPosition = tileMap.empty.position;
        var shuffleTiles = movementMap(emptyPosition);
        var tilePosition = shuffleTiles[Math.floor(Math.floor(Math.random() * shuffleTiles.length))];
        var locatedTile;
        for (var i = 1; i <= 9; i++) {
            if (i == tileMap.empty.tileNumber) {
                continue;
            }
            if (tileMap[i].position == tilePosition) {
                var locatedTileNumber = tileMap[i].tileNumber;
                if (locatedTileNumber >= tileMap.empty.tileNumber) {
                    locatedTileNumber--;
                }
                locatedTile = tiles[locatedTileNumber - 1];
            }
        }

        if (lastShuffled != locatedTileNumber) {
            moveTile(locatedTile);
            lastShuffled = locatedTileNumber;
        } else {
            shuffleLoop();
        }
    }

    function clearTimers(timeoutArray) {
        for (var i = 0; i < timeoutArray.length; i++) {
            clearTimeout(timeoutArray[i])
        }
    }

    // Temporary function for solving puzzle.
    // To be reimplemented with a more sophisticated algorithm
    solveTimeouts = []
    function solve() {
        clearTimers(shuffleTimeouts);
        clearTimers(solveTimeouts);

        var timeout = 0;
        var repeater = history.length;
        for (var i = 0; i < repeater; i++) {
            timeout = i * 100;
            var tileNumber = history.pop();
            if (tileNumber >= tileMap.empty.tileNumber) {
                tileNumber--;
            }
            var tile = tiles[tileNumber - 1];
            solveTimeouts.push(setTimeout(moveTile, timeout, tile, false));
        }
        puzzleSolved(timeout + 500);
    }
}
//#endregion
