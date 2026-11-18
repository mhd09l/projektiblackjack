const SUITS = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SYMBOLS = {
    Hearts: '♥',
    Diamonds: '♦',
    Clubs: '♣',
    Spades: '♠'
};

let blackjackReturnFocus = null;

const GAME = {
    balance: 1000,
    cursor: 0,
    player: [],
    dealer: [],
    active: false,
    sound: true,
    context: null,
    roundSeed: null,
    lastSeed: null,
    lastCursor: 0,
    bet: 0,
    lossTimer: null
};

function scrollToGames() {
    document.getElementById('games').scrollIntoView({
        behavior: 'smooth'
    });
}

function openGame(name) {
    if (name !== 'Blackjack') {
        const notice = document.getElementById('notice');
        notice.innerText = name + ' - Coming Soon';
        notice.style.display = 'block';

        setTimeout(() => {
            notice.style.display = 'none';
        }, 2500);

        return;
    }

    const game = document.getElementById('blackjack');
    blackjackReturnFocus = document.activeElement;
    game.classList.add('is-open');
    game.setAttribute('aria-hidden', 'false');
    document.body.classList.add('game-open');
    game.querySelector('.bj-back').focus();
    playSound('open');
}

function closeBlackjack() {
    const game = document.getElementById('blackjack');
    game.classList.remove('is-open');
    game.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('game-open');
    if (blackjackReturnFocus && typeof blackjackReturnFocus.focus === 'function') {
        blackjackReturnFocus.focus();
    }
}

function closeResult() {
    if (GAME.lossTimer) {
        clearTimeout(GAME.lossTimer);
        GAME.lossTimer = null;
    }

    const overlay = document.getElementById('result-overlay');
    overlay.classList.remove('is-visible');
    overlay.setAttribute('aria-hidden', 'true');
}

function showLostPopup() {
    const overlay = document.getElementById('result-overlay');
    document.getElementById('result-title').textContent = 'YOU LOST';
    overlay.classList.add('is-visible');
    overlay.setAttribute('aria-hidden', 'false');
    GAME.lossTimer = setTimeout(closeResult, 2400);
}

function toggleSound() {
    GAME.sound = !GAME.sound;

    const button = document.getElementById('sound-toggle');
    button.textContent = GAME.sound ? 'SOUND ON' : 'SOUND OFF';
    button.setAttribute('aria-pressed', String(GAME.sound));

    if (GAME.sound) {
        playSound('deal');
    }
}

function playSound(kind) {
    if (!GAME.sound) return;

    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        GAME.context ||= new AudioContext();

        if (GAME.context.state === 'suspended') {
            GAME.context.resume();
        }

        const now = GAME.context.currentTime;
        const notes =
            kind === 'win' ? [660, 880, 1100] :
            kind === 'lose' ? [330, 247] :
            kind === 'open' ? [440, 660] :
            [520];

        notes.forEach((frequency, index) => {
            const oscillator = GAME.context.createOscillator();
            const gain = GAME.context.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.value = frequency;

            gain.gain.setValueAtTime(0.0001, now + index * 0.085);
            gain.gain.exponentialRampToValueAtTime(
                0.09,
                now + index * 0.085 + 0.012
            );
            gain.gain.exponentialRampToValueAtTime(
                0.0001,
                now + index * 0.085 + 0.16
            );

            oscillator.connect(gain).connect(GAME.context.destination);
            oscillator.start(now + index * 0.085);
            oscillator.stop(now + index * 0.085 + 0.17);
        });
    } catch (error) {
        // Peli toimii, vaikka selain estäisi äänen.
    }
}

function bytesToHex(bytes) {
    return Array.from(bytes)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}

async function hmacSHA512(serverSeed, message) {
    if (!window.crypto || !window.crypto.subtle) {
        throw new Error(
            'Salaus ei ole käytettävissä. Avaa sivu modernissa selaimessa.'
        );
    }

    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(serverSeed),
        { name: 'HMAC', hash: 'SHA-512' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        new TextEncoder().encode(message)
    );

    return bytesToHex(new Uint8Array(signature));
}

function bytesToFloat(hash) {
    const bytes = [0, 2, 4, 6].map(index =>
        parseInt(hash.slice(index, index + 2), 16)
    );

    return bytes[0] / 256
        + bytes[1] / 65536
        + bytes[2] / 16777216
        + bytes[3] / 4294967296;
}

async function dealCard(serverSeed, clientSeed, nonce, cursor) {
    const hash = await hmacSHA512(
        serverSeed,
        `${clientSeed}:${nonce}:${cursor}`
    );

    const index = Math.floor(bytesToFloat(hash) * 52);
    const rank = RANKS[index % 13];
    const suit = SUITS[Math.floor(index / 13)];

    return {
        rank,
        suit,
        symbol: rank + SYMBOLS[suit]
    };
}

async function getSequence(serverSeed, clientSeed, nonce) {
    const cards = [];

    for (let cursor = 0; cursor < 52; cursor++) {
        cards.push(await dealCard(serverSeed, clientSeed, nonce, cursor));
    }

    return cards;
}

function bjValue(cards) {
    let total = 0;
    let aces = 0;

    for (const card of cards) {
        if (card.rank === 'A') {
            total += 11;
            aces++;
        } else if (['10', 'J', 'Q', 'K'].includes(card.rank)) {
            total += 10;
        } else {
            total += Number(card.rank);
        }
    }

    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }

    return total;
}

function seeds() {
    const serverInput = document.getElementById('server-seed');

    if (!serverInput.value) {
        const seed = new Uint8Array(24);
        crypto.getRandomValues(seed);
        serverInput.value = bytesToHex(seed);
    }

    return {
        server: serverInput.value,
        client: document.getElementById('client-seed').value || 'xx-player',
        nonce: Number(document.getElementById('nonce').value) || 0
    };
}

async function nextCard() {
    const seed = GAME.roundSeed || seeds();

    return dealCard(
        seed.server,
        seed.client,
        seed.nonce,
        GAME.cursor++
    );
}

function paintCard(element, card, hidden) {
    const red = card.suit === 'Hearts' || card.suit === 'Diamonds';
    element.classList.toggle('red-card', red && !hidden);
    element.classList.toggle('card-back', hidden);

    if (hidden) {
        element.innerHTML = '<span class="card-back-mark">RC</span>';
        element.setAttribute('aria-label', 'Hidden dealer card');
    } else {
        element.innerHTML =
            `<span class="card-corner">${card.rank}<br>${SYMBOLS[card.suit]}</span>` +
            `<span class="card-center">${SYMBOLS[card.suit]}</span>`;
        element.setAttribute('aria-label', `${card.rank} of ${card.suit}`);
    }
}

function renderCards(containerId, cards, hideHole = false) {
    const container = document.getElementById(containerId);
    while (container.children.length > cards.length) {
        container.lastElementChild.remove();
    }

    cards.forEach((card, index) => {
        const hidden = hideHole && index === 1;
        let element = container.children[index];

        if (!element) {
            element = document.createElement('div');
            element.className = 'playing-card';
            paintCard(element, card, hidden);
            element.style.visibility = 'hidden';
            const shoe = document.getElementById('card-shoe');
            const shoeRect = shoe.getBoundingClientRect();
            container.append(element);

            const cardRect = element.getBoundingClientRect();
            element.style.setProperty('--deal-x', `${shoeRect.left + shoeRect.width / 2 - cardRect.left - cardRect.width / 2}px`);
            element.style.setProperty('--deal-y', `${shoeRect.top + shoeRect.height / 2 - cardRect.top - cardRect.height / 2}px`);
            element.style.setProperty('--deal-rotation', `${index % 2 ? -7 : 7}deg`);
            element.style.visibility = '';
            element.classList.add('card-dealing');
            window.setTimeout(() => element.classList.remove('card-dealing'), 560);

            shoe.classList.remove('is-dealing');
            void shoe.offsetWidth;
            shoe.classList.add('is-dealing');
            window.setTimeout(() => shoe.classList.remove('is-dealing'), 460);
            return;
        }

        const wasHidden = element.classList.contains('card-back');
        paintCard(element, card, hidden);
        if (wasHidden && !hidden) {
            element.classList.add('card-reveal');
            window.setTimeout(() => element.classList.remove('card-reveal'), 360);
        }
    });
}

function updateTable(revealDealer = false) {
    renderCards('player-cards', GAME.player);
    renderCards(
        'dealer-cards',
        GAME.dealer,
        !revealDealer && GAME.active
    );

    document.getElementById('player-total').textContent =
        GAME.player.length ? bjValue(GAME.player) : '—';

    document.getElementById('dealer-total').textContent =
        GAME.dealer.length
            ? (!revealDealer && GAME.active
                ? bjValue([GAME.dealer[0]]) + ' + ?'
                : bjValue(GAME.dealer))
            : '—';

    document.getElementById('bj-balance').textContent =
        `${GAME.balance.toLocaleString()} PTS`;
}

function animateResult(result) {
    const tone =
        result === 'win' ? 'score-win' :
        result === 'loss' ? 'score-loss' :
        'score-push';

    ['player-total', 'dealer-total', 'bj-balance'].forEach(id => {
        const element = document.getElementById(id);

        element.classList.remove('score-win', 'score-loss', 'score-push');
        void element.offsetWidth;
        element.classList.add(tone);
    });

    const table = document.querySelector('.table-felt');

    table.classList.remove('table-win', 'table-loss', 'table-push');
    void table.offsetWidth;

    const tableResult =
        result === 'win' ? 'win' :
        result === 'loss' ? 'loss' :
        'push';

    table.classList.add(`table-${tableResult}`);
}

function setMessage(message, result = '') {
    const element = document.getElementById('game-message');

    element.textContent = message;
    element.className =
        `table-message${result ? ` ${result}` : ''}`;
}

function setActions(active) {
    document.getElementById('hit-button').disabled = !active;
    document.getElementById('stand-button').disabled = !active;
    document.getElementById('deal-button').disabled = active;
    document.getElementById('bet-amount').disabled = active;
    document.querySelectorAll('.bet-chip').forEach(chip => { chip.disabled = active; });
}

async function startRound() {
    if (GAME.active) return;

    closeResult();

    const betInput = document.getElementById('bet-amount');
    const bet = Math.floor(Number(betInput.value));

    if (!Number.isFinite(bet) || bet < 1 || bet > GAME.balance) {
        setMessage(
            `Enter a bet from 1 to ${GAME.balance} points.`,
            'notice-result'
        );
        return;
    }

    try {
        GAME.roundSeed = seeds();
        GAME.bet = bet;
        GAME.balance -= bet;
        GAME.player = [];
        GAME.dealer = [];
        document.getElementById('player-cards').replaceChildren();
        document.getElementById('dealer-cards').replaceChildren();
        GAME.cursor = 0;
        GAME.active = true;

        document.getElementById('sequence-output').textContent =
            'Round in progress. Verify after the hand is complete to reveal the full cursor sequence.';

        setActions(true);
        document.getElementById('hit-button').disabled = true;
        document.getElementById('stand-button').disabled = true;
        setMessage('Cards are being dealt.');

        GAME.player.push(await nextCard());
        updateTable();
        playSound('deal');
        await new Promise(resolve => setTimeout(resolve, 175));

        GAME.dealer.push(await nextCard());
        updateTable();
        playSound('deal');
        await new Promise(resolve => setTimeout(resolve, 175));

        GAME.player.push(await nextCard());
        updateTable();
        playSound('deal');
        await new Promise(resolve => setTimeout(resolve, 175));

        GAME.dealer.push(await nextCard());
        updateTable();
        playSound('deal');
        await new Promise(resolve => setTimeout(resolve, 320));

        if (bjValue(GAME.player) === 21) {
            await finishRound('blackjack');
        } else {
            document.getElementById('hit-button').disabled = false;
            document.getElementById('stand-button').disabled = false;
            setMessage('Your move. Hit or stand.');
        }
    } catch (error) {
        GAME.active = false;
        GAME.balance += GAME.bet;
        updateTable();
        setActions(false);
        setMessage(error.message, 'notice-result');
    }
}

async function hit() {
    if (!GAME.active) return;

    try {
        GAME.player.push(await nextCard());
        updateTable();
        playSound('deal');

        const total = bjValue(GAME.player);

        if (total >= 21) {
            await finishRound(total > 21 ? 'bust' : 'stand');
        }
    } catch (error) {
        setMessage(error.message, 'notice-result');
    }
}

async function stand() {
    if (!GAME.active) return;

    try {
        while (bjValue(GAME.dealer) < 17) {
            GAME.dealer.push(await nextCard());
            updateTable();
            playSound('deal');

            await new Promise(resolve => setTimeout(resolve, 260));
        }

        await finishRound('stand');
    } catch (error) {
        setMessage(error.message, 'notice-result');
    }
}

async function finishRound(reason) {
    GAME.active = false;

    const playerTotal = bjValue(GAME.player);
    const dealerTotal = bjValue(GAME.dealer);
    const natural =
        reason === 'blackjack' && GAME.player.length === 2;

    let result;
    let message;

    if (reason === 'bust' || playerTotal > 21) {
        result = 'loss';
        message = `BUST — ${playerTotal}. You lose ${GAME.bet} points.`;
    } else if (natural && dealerTotal !== 21) {
        GAME.balance += Math.floor(GAME.bet * 2.5);
        result = 'win';
        message =
            `BLACKJACK! You win ${Math.floor(GAME.bet * 1.5)} points.`;
    } else if (dealerTotal > 21 || playerTotal > dealerTotal) {
        GAME.balance += GAME.bet * 2;
        result = 'win';
        message = `YOU WIN ${GAME.bet} POINTS.`;
    } else if (playerTotal === dealerTotal) {
        GAME.balance += GAME.bet;
        result = 'push';
        message = 'PUSH — your bet is returned.';
    } else {
        result = 'loss';
        message =
            `DEALER WINS — ${dealerTotal}. You lose ${GAME.bet} points.`;
    }

    updateTable(true);
    animateResult(result);
    setActions(false);
    setMessage(message, `${result}-result`);
    if (result === 'loss') showLostPopup();

    playSound(
        result === 'win' ? 'win' :
        result === 'loss' ? 'lose' :
        'deal'
    );

    GAME.lastSeed = { ...GAME.roundSeed };
    GAME.lastCursor = GAME.cursor;

    document.getElementById('nonce').value =
        GAME.lastSeed.nonce + 1;
}

async function verifyCurrentRound() {
    const output = document.getElementById('sequence-output');

    try {
        const seed = GAME.lastSeed || seeds();

        output.textContent = 'Calculating the 52-card sequence…';

        const sequence = await getSequence(
            seed.server,
            seed.client,
            seed.nonce
        );

        const used = GAME.lastSeed ? GAME.lastCursor : 4;

        output.textContent =
            `Round nonce ${seed.nonce}; used cursors 0–${Math.max(0, used - 1)}. ` +
            `Full 52-card sequence: ${sequence.map(card => card.symbol).join(', ')}`;
    } catch (error) {
        output.textContent = error.message;
    }
}

const betAmountInput = document.getElementById('bet-amount');

function syncBetChips() {
    document.querySelectorAll('.bet-chip').forEach(chip => {
        chip.setAttribute('aria-pressed', String(Number(chip.dataset.bet) === Number(betAmountInput.value)));
    });
}

document.querySelectorAll('.bet-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        betAmountInput.value = chip.dataset.bet;
        syncBetChips();
    });
});
betAmountInput.addEventListener('input', syncBetChips);

document.addEventListener('keydown', event => {
    const game = document.getElementById('blackjack');
    if (!game || !game.classList.contains('is-open')) return;

    if (event.key === 'Escape') {
        closeBlackjack();
        return;
    }

    if (event.key === 'Tab') {
        const items = [...game.querySelectorAll('button:not(:disabled), input, summary')]
            .filter(item => item.getClientRects().length > 0);
        const first = items[0];
        const last = items[items.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }
});
