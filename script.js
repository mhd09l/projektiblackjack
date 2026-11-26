const SUITS = ["Hearts", "Diamonds", "Clubs", "Spades"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SYMBOLS = { Hearts: "♥", Diamonds: "♦", Clubs: "♣", Spades: "♠" };
const API_URL = "http://localhost:3000/games";
const starterGames = [
    { id: 1, name: "Blackjack", category: "Card Game", description: "Play a classic hand against the dealer for virtual points.", status: "playable" },
    { id: 2, name: "Roulette", category: "Table Game", description: "A classic wheel game for a future update.", status: "coming-soon" },
    { id: 3, name: "Poker", category: "Card Game", description: "A strategy card game for a future update.", status: "coming-soon" }
];

let games = [...starterGames];
let editingId = null;
let deletingId = null;
let returnFocus = null;
const gameList = document.querySelector("#games-list");
const gameDialog = document.querySelector("#game-dialog");
const deleteDialog = document.querySelector("#delete-dialog");
const gameForm = document.querySelector("#game-form");
const toast = document.querySelector("#app-toast");

const blackjack = {
    balance: 1000,
    bet: 0,
    player: [],
    dealer: [],
    active: false,
    deck: []
};

function showView(id) {
    document.querySelectorAll(".app-view").forEach(view => view.hidden = view.id !== id);
    document.querySelectorAll("[data-view-target]").forEach(button => {
        if (button.dataset.viewTarget === id) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
    });
    history.replaceState(null, "", `#${id}`);
}

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: options.body ? { "Content-Type": "application/json" } : {}
    });
    if (!response.ok) throw new Error(`Server returned ${response.status}.`);
    return response.status === 204 ? null : response.json();
}

function showToast(message) {
    toast.textContent = message;
    if (typeof toast.showPopover === "function") toast.showPopover();
    else toast.classList.add("is-visible");
    setTimeout(() => {
        if (typeof toast.hidePopover === "function") toast.hidePopover();
        else toast.classList.remove("is-visible");
    }, 3000);
}

async function loadGames() {
    const status = document.querySelector("#api-status");
    try {
        const data = await apiRequest(API_URL);
        if (Array.isArray(data)) games = data;
        status.textContent = `Loaded ${games.length} games from JSON Server.`;
    } catch (error) {
        status.textContent = "JSON Server is unavailable. Showing starter games.";
        showToast("Could not load the catalog. Start JSON Server to save changes.");
    }
    renderGames();
}

function renderGames() {
    gameList.replaceChildren();
    if (!games.length) {
        gameList.innerHTML = '<p class="empty-state">The library is empty.</p>';
        return;
    }

    games.forEach(game => {
        const card = document.createElement("article");
        card.className = "game-card";
        card.dataset.id = game.id;
        card.innerHTML = `
            <div class="game-card-meta">
                <span>${escapeHtml(game.category)}</span>
                <span class="game-status">${game.status === "playable" ? "PLAYABLE" : "COMING SOON"}</span>
            </div>
            <h2>${escapeHtml(game.name)}</h2>
            <p class="game-description">${escapeHtml(game.description)}</p>
            <div class="game-card-actions">
                <button class="button button-primary" type="button" data-action="play">PLAY</button>
                <button class="button button-secondary" type="button" data-action="edit">EDIT</button>
                <button class="button button-quiet" type="button" data-action="delete">DELETE</button>
            </div>`;
        gameList.append(card);
    });
}

function escapeHtml(value) {
    const element = document.createElement("span");
    element.textContent = value;
    return element.innerHTML;
}

function openEditor(game = null) {
    editingId = game?.id ?? null;
    gameForm.reset();
    document.querySelector("#game-id").value = editingId ?? "";
    document.querySelector("#game-name").value = game?.name ?? "";
    document.querySelector("#game-category").value = game?.category ?? "";
    document.querySelector("#game-description").value = game?.description ?? "";
    document.querySelector("#game-status").value = game?.status ?? "coming-soon";
    document.querySelector("#game-dialog-title").textContent = game ? "EDIT GAME" : "ADD A GAME";
    gameDialog.showModal();
}

async function saveGame(event) {
    event.preventDefault();

    const game = {
        name: document.querySelector("#game-name").value.trim(),
        category: document.querySelector("#game-category").value.trim(),
        description: document.querySelector("#game-description").value.trim(),
        status: document.querySelector("#game-status").value
    };

    try {
        if (editingId) {
            const updated = await apiRequest(`${API_URL}/${encodeURIComponent(editingId)}`, {
                method: "PATCH",
                body: JSON.stringify(game)
            });
            games = games.map(item => String(item.id) === String(editingId) ? { ...item, ...updated, ...game } : item);
            showToast(`${game.name} was updated.`);
        } else {
            const created = await apiRequest(API_URL, { method: "POST", body: JSON.stringify(game) });
            games.push(created);
            showToast(`${game.name} was added.`);
        }
        renderGames();
        gameDialog.close();
    } catch (error) {
        showToast(`Could not save the game. ${error.message}`);
    }
}

async function deleteGame() {
    try {
        await apiRequest(`${API_URL}/${encodeURIComponent(deletingId)}`, { method: "DELETE" });
        games = games.filter(game => String(game.id) !== String(deletingId));
        renderGames();
        deleteDialog.close();
        showToast("Game deleted.");
    } catch (error) {
        showToast(`Could not delete the game. ${error.message}`);
    }
}

function shuffleDeck() {
    const deck = RANKS.flatMap(rank => SUITS.map(suit => ({
        rank,
        suit,
        symbol: `${rank}${SYMBOLS[suit]}`
    })));
    deck.forEach((card, index) => {
        const randomIndex = Math.floor(Math.random() * deck.length);
        [deck[index], deck[randomIndex]] = [deck[randomIndex], deck[index]];
    });
    return deck;
}

function handValue(cards) {
    let value = 0;
    let aces = 0;
    cards.forEach(card => {
        if (card.rank === "A") { value += 11; aces++; }
        else value += ["10", "J", "Q", "K"].includes(card.rank) ? 10 : Number(card.rank);
    });
    while (value > 21 && aces) { value -= 10; aces--; }
    return value;
}

function renderBlackjack(reveal = false) {
    let dealOrder = 0;
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    ["player", "dealer"].forEach(type => {
        const container = document.querySelector(`#${type}-cards`);
        blackjack[type].forEach((card, index) => {
            let element = container.children[index];
            if (!element) {
                element = document.createElement("div");
                element.className = "playing-card";
                element.style.opacity = "0";
                container.append(element);
                const animation = element.animate(
                    [{ opacity: 0, transform: `translateY(${reduceMotion ? 5 : 20}px)` }, { opacity: 1, transform: "translateY(0)" }],
                    {
                        duration: reduceMotion ? 120 : 300,
                        delay: dealOrder * (reduceMotion ? 150 : 350),
                        easing: "ease-out",
                        fill: "both"
                    }
                );
                animation.onfinish = () => {
                    element.style.removeProperty("opacity");
                    animation.cancel();
                };
                dealOrder++;
            }
            const hidden = type === "dealer" && index === 1 && !reveal;
            element.textContent = hidden ? "?" : card.symbol;
            element.setAttribute("aria-label", hidden ? "Hidden dealer card" : `${card.rank} of ${card.suit}`);
            if (!hidden && (card.suit === "Hearts" || card.suit === "Diamonds")) element.classList.add("red-card");
        });
    });
    document.querySelector("#player-total").textContent = blackjack.player.length ? handValue(blackjack.player) : "—";
    document.querySelector("#dealer-total").textContent = blackjack.dealer.length
        ? (reveal ? handValue(blackjack.dealer) : handValue([blackjack.dealer[0]]) + " + ?")
        : "—";
    document.querySelector("#bj-balance").textContent = `${blackjack.balance.toLocaleString()} PTS`;
}

function setBlackjackButtons() {
    document.querySelector("#deal-button").disabled = blackjack.active;
    document.querySelector("#hit-button").disabled = !blackjack.active;
    document.querySelector("#stand-button").disabled = !blackjack.active;
}

function openBlackjack() {
    returnFocus = document.activeElement;
    document.querySelector("#blackjack").showModal();
    renderBlackjack();
}

function closeBlackjack() {
    document.querySelector("#blackjack").close();
    returnFocus?.focus();
}

function startRound() {
    if (blackjack.active) return;
    const bet = Number(document.querySelector("#bet-amount").value);
    if (!Number.isInteger(bet) || bet < 1 || bet > blackjack.balance) {
        document.querySelector("#bj-status").textContent = `Enter a bet from 1 to ${blackjack.balance}.`;
        return;
    }
    blackjack.bet = bet;
    blackjack.balance -= bet;
    blackjack.player = [];
    blackjack.dealer = [];
    document.querySelector("#player-cards").replaceChildren();
    document.querySelector("#dealer-cards").replaceChildren();
    blackjack.deck = shuffleDeck();
    blackjack.active = true;
    blackjack.player.push(blackjack.deck.pop(), blackjack.deck.pop());
    blackjack.dealer.push(blackjack.deck.pop(), blackjack.deck.pop());
    setBlackjackButtons();
    renderBlackjack();
    if (handValue(blackjack.player) === 21) finishRound("blackjack");
    else document.querySelector("#bj-status").textContent = "Hit or stand.";
}

function hit() {
    if (!blackjack.active) return;
    blackjack.player.push(blackjack.deck.pop());
    renderBlackjack();
    const value = handValue(blackjack.player);
    if (value >= 21) finishRound(value > 21 ? "bust" : "stand");
}

function stand() {
    if (!blackjack.active) return;
    while (handValue(blackjack.dealer) < 17) blackjack.dealer.push(blackjack.deck.pop());
    finishRound("stand");
}

function finishRound(reason) {
    blackjack.active = false;
    const player = handValue(blackjack.player);
    const dealer = handValue(blackjack.dealer);
    let message;

    if (reason === "bust" || player > 21) message = `Bust — you lose ${blackjack.bet} points.`;
    else if (reason === "blackjack" && blackjack.player.length === 2 && dealer !== 21) {
        blackjack.balance += Math.floor(blackjack.bet * 2.5);
        message = `Blackjack — you win ${Math.floor(blackjack.bet * 1.5)} points.`;
    } else if (dealer > 21 || player > dealer) {
        blackjack.balance += blackjack.bet * 2;
        message = `You win ${blackjack.bet} points.`;
    } else if (player === dealer) {
        blackjack.balance += blackjack.bet;
        message = "Push — your bet is returned.";
    } else message = `Dealer wins — you lose ${blackjack.bet} points.`;

    document.querySelector("#bj-status").textContent = message;
    setBlackjackButtons();
    renderBlackjack(true);
}

document.querySelectorAll("[data-view-target]").forEach(button =>
    button.addEventListener("click", () => showView(button.dataset.viewTarget))
);
document.querySelector("#add-game-button").addEventListener("click", () => openEditor());
gameForm.addEventListener("submit", saveGame);
document.querySelector("#confirm-delete-button").addEventListener("click", deleteGame);
document.querySelectorAll("[data-close-dialog]").forEach(button =>
    button.addEventListener("click", () => document.querySelector(`#${button.dataset.closeDialog}`).close())
);
gameList.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const card = button.closest(".game-card");
    const game = games.find(item => String(item.id) === String(card.dataset.id));
    if (!game) return;
    if (button.dataset.action === "play") {
        if (game.name.toLowerCase() === "blackjack" && game.status === "playable") openBlackjack();
        else showToast(`${game.name} is not playable yet.`);
    }
    if (button.dataset.action === "edit") openEditor(game);
    if (button.dataset.action === "delete") {
        deletingId = game.id;
        document.querySelector("#delete-game-name").textContent = `"${game.name}" will be removed.`;
        deleteDialog.showModal();
    }
});
document.querySelector("#close-blackjack").addEventListener("click", closeBlackjack);
document.querySelector("#deal-button").addEventListener("click", startRound);
document.querySelector("#hit-button").addEventListener("click", hit);
document.querySelector("#stand-button").addEventListener("click", stand);

const initialView = location.hash.slice(1);
showView(document.querySelector(`#${initialView}`)?.classList.contains("app-view") ? initialView : "home-view");
loadGames();
