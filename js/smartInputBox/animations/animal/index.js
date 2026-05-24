/**
 * Animal pet animations.
 *
 * Reuses the same parade/growth contract as the existing pets:
 * create(count), addFollower(count), updatePosition(rect), hide(), destroy().
 */
class AnimalPetAnimation {
    constructor(config) {
        this.id = config.id;
        this.name = chrome.i18n.getMessage(config.nameKey) || config.name;
        this.icon = config.icon;
        this.maxCount = 7;
        this.growAt = [10, 100, 300, 500, 700, 900, 1100];
        this._el = null;
        this.marchDuration = config.marchDuration || 45;
        this._leaderSize = config.leaderSize || 48;
        this._followerSize = config.followerSize || 32;
        this._height = config.height || 52;
        this._topOffset = config.topOffset || 52;
        this._variants = config.variants;
        this._renderer = config.renderer;
    }

    _animalSvg(w, variantIdx) {
        const v = this._variants[variantIdx % this._variants.length];
        const h = Math.round(w * 48 / 64);
        return `<svg class="animal-pet-svg" viewBox="0 0 64 48" width="${w}" height="${h}" fill="none" aria-hidden="true">${this._renderer(v, variantIdx)}</svg>`;
    }

    create(count) {
        if (this._el && document.documentElement.contains(this._el)) return;
        this._el = null;
        const n = Math.min(count || 1, this.maxCount);
        let items = '';
        for (let i = 0; i < n - 1; i++) {
            items += `<span class="animal-pet-item animal-pet-step-${(i % 4) + 1}">${this._animalSvg(this._followerSize, i + 1)}</span>`;
        }
        items += `<span class="animal-pet-item animal-pet-step-1 animal-pet-leader">${this._animalSvg(this._leaderSize, 0)}</span>`;

        const el = document.createElement('div');
        el.className = `ait-animal-pet-parade ait-animal-pet-${this.id}`;
        el.style.display = 'none';
        el.style.height = `${this._height}px`;
        el.innerHTML = `<div class="animal-pet-track"><div class="animal-pet-group" style="animation-duration:${this.marchDuration}s">${items}</div></div>`;
        (document.body || document.documentElement).appendChild(el);
        this._el = el;
    }

    addFollower(newCount) {
        if (!this._el) return;
        const group = this._el.querySelector('.animal-pet-group');
        const leader = group?.querySelector('.animal-pet-leader');
        if (!group || !leader) return;

        const i = newCount - 2;
        const span = document.createElement('span');
        span.className = `animal-pet-item animal-pet-step-${(i % 4) + 1}`;
        span.innerHTML = this._animalSvg(this._followerSize, i + 1);
        group.insertBefore(span, leader);
    }

    updatePosition(referenceRect) {
        if (!this._el || !referenceRect?.width) return;
        const s = this._el.style;
        s.left = `${referenceRect.left}px`;
        s.width = `${referenceRect.width}px`;
        s.top = `${referenceRect.top - this._topOffset}px`;
        s.setProperty('--pw', `${referenceRect.width}px`);
        s.display = 'block';
    }

    hide() {
        if (this._el) this._el.style.display = 'none';
    }

    destroy() {
        if (this._el?.parentNode) {
            this._el.parentNode.removeChild(this._el);
        }
        this._el = null;
    }
}

function renderCat(v) {
    return `
        <ellipse class="animal-pet-shadow" cx="34" cy="46" rx="25" ry="2.8" fill="#000" opacity="0.22"/>
        <g class="animal-pet-tail">
            <path d="M14 35Q3 30 5 20Q7 12 14 16" stroke="${v.tail}" stroke-width="4" stroke-linecap="round" fill="none"/>
            <path d="M14 35Q3 30 5 20Q7 12 14 16" stroke="${v.tailTip}" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.5"/>
        </g>
        <g class="animal-pet-body">
            <ellipse cx="30" cy="33" rx="20" ry="7.5" fill="${v.body}"/>
            <path d="M22 27L24 39M29 26L30 39M36 27L35 39" stroke="${v.stripe}" stroke-width="1.5" stroke-linecap="round" opacity="0.25"/>
            <ellipse cx="28" cy="37" rx="12" ry="3" fill="${v.belly}" opacity="0.6"/>
            <circle cx="50" cy="20" r="13" fill="${v.face}"/>
            <path d="M40 12L43 2L48 13Z" fill="${v.ear}"/>
            <path d="M52 10L57 0L60 12Z" fill="${v.ear}"/>
            <path d="M42 11L43.5 5L46 12Z" fill="${v.innerEar}"/>
            <path d="M53 9L56.5 4L58 11Z" fill="${v.innerEar}"/>
            <circle cx="44" cy="18" r="3" fill="#fff"/>
            <circle cx="56" cy="18" r="3" fill="#fff"/>
            <circle cx="44.5" cy="18.5" r="1.8" fill="#2D1B00"/>
            <circle cx="56.5" cy="18.5" r="1.8" fill="#2D1B00"/>
            <circle cx="43.5" cy="17.5" r="0.8" fill="#fff"/>
            <circle cx="55.5" cy="17.5" r="0.8" fill="#fff"/>
            <ellipse cx="40" cy="23" rx="2.5" ry="1.5" fill="#FFB0B8" opacity="0.4"/>
            <ellipse cx="60" cy="23" rx="2.5" ry="1.5" fill="#FFB0B8" opacity="0.4"/>
            <ellipse cx="50" cy="23" rx="1.8" ry="1.2" fill="${v.nose}"/>
            <path d="M50 24.5Q47.5 27 45 25.5M50 24.5Q52.5 27 55 25.5" stroke="${v.mouth}" stroke-width="1" stroke-linecap="round" fill="none"/>
            <line x1="39" y1="21" x2="32" y2="19.5" stroke="${v.whisker}" stroke-width="0.8" stroke-linecap="round" opacity="0.6"/>
            <line x1="39" y1="23" x2="32" y2="24" stroke="${v.whisker}" stroke-width="0.8" stroke-linecap="round" opacity="0.6"/>
            <line x1="61" y1="21" x2="68" y2="19.5" stroke="${v.whisker}" stroke-width="0.8" stroke-linecap="round" opacity="0.6"/>
            <line x1="61" y1="23" x2="68" y2="24" stroke="${v.whisker}" stroke-width="0.8" stroke-linecap="round" opacity="0.6"/>
        </g>
        <ellipse class="animal-pet-leg animal-pet-leg-a" cx="16" cy="42" rx="4" ry="3" fill="${v.paw}"/>
        <ellipse class="animal-pet-leg animal-pet-leg-b" cx="26" cy="42.5" rx="4" ry="3" fill="${v.paw}"/>
        <ellipse class="animal-pet-leg animal-pet-leg-c" cx="37" cy="42" rx="4" ry="3" fill="${v.paw}"/>
        <ellipse class="animal-pet-leg animal-pet-leg-a" cx="46" cy="42" rx="4" ry="3" fill="${v.paw}"/>
    `;
}

function renderDog(v) {
    return `
        <ellipse class="animal-pet-shadow" cx="34" cy="46" rx="25" ry="2.8" fill="#000" opacity="0.22"/>
        <g class="animal-pet-tail">
            <path d="M14 31Q7 26 10 19Q12 15 16 20" stroke="${v.tail}" stroke-width="4" stroke-linecap="round" fill="none"/>
        </g>
        <g class="animal-pet-body">
            <ellipse cx="30" cy="33" rx="20" ry="8" fill="${v.body}"/>
            <ellipse cx="28" cy="37" rx="12" ry="3" fill="${v.chest}" opacity="0.65"/>
            <circle cx="50" cy="20" r="13" fill="${v.face}"/>
            <path d="M38 14Q34 16 35 26Q38 28 41 22Z" fill="${v.ear}"/>
            <path d="M56 10Q62 12 62 22Q58 26 56 18Z" fill="${v.ear}"/>
            <circle cx="44" cy="18" r="3.2" fill="#fff"/>
            <circle cx="56" cy="18" r="3.2" fill="#fff"/>
            <circle cx="44.5" cy="18.5" r="2" fill="#2D1B00"/>
            <circle cx="56.5" cy="18.5" r="2" fill="#2D1B00"/>
            <circle cx="43.5" cy="17.5" r="0.9" fill="#fff"/>
            <circle cx="55.5" cy="17.5" r="0.9" fill="#fff"/>
            <ellipse cx="50" cy="24" rx="5" ry="3.5" fill="${v.muzzle}"/>
            <ellipse cx="50" cy="22.5" rx="2.2" ry="1.5" fill="${v.nose}"/>
            <path d="M50 24Q47 27 44 25.5M50 24Q53 27 56 25.5" stroke="${v.mouth}" stroke-width="1" stroke-linecap="round" fill="none"/>
            <ellipse cx="50" cy="27" rx="2.5" ry="2" fill="${v.tongue}" opacity="0.85"/>
            <ellipse cx="40" cy="23" rx="2.5" ry="1.5" fill="#FFB0B8" opacity="0.35"/>
            <ellipse cx="60" cy="23" rx="2.5" ry="1.5" fill="#FFB0B8" opacity="0.35"/>
            ${v.patch ? `<ellipse cx="56" cy="14" rx="6" ry="5" fill="${v.patch}" opacity="0.35"/>` : ''}
        </g>
        <ellipse class="animal-pet-leg animal-pet-leg-a" cx="16" cy="42" rx="4" ry="3" fill="${v.paw}"/>
        <ellipse class="animal-pet-leg animal-pet-leg-b" cx="26" cy="42.5" rx="4" ry="3" fill="${v.paw}"/>
        <ellipse class="animal-pet-leg animal-pet-leg-c" cx="37" cy="42" rx="4" ry="3" fill="${v.paw}"/>
        <ellipse class="animal-pet-leg animal-pet-leg-a" cx="46" cy="42" rx="4" ry="3" fill="${v.paw}"/>
    `;
}

function renderRedPanda(v) {
    return `
        <ellipse class="animal-pet-shadow" cx="34" cy="46" rx="25" ry="2.8" fill="#000" opacity="0.23"/>
        <g class="animal-pet-tail animal-pet-red-panda-tail">
            <ellipse cx="10" cy="36" rx="5" ry="3.5" fill="${v.dark}"/>
        </g>
        <g class="animal-pet-body">
            <ellipse cx="30" cy="33" rx="20" ry="8" fill="${v.light}"/>
            <ellipse cx="22" cy="31" rx="9" ry="6" fill="${v.dark}" opacity="0.75"/>
            <ellipse cx="28" cy="37" rx="12" ry="3" fill="${v.light}" opacity="0.8"/>
            <circle cx="50" cy="20" r="13" fill="${v.light}"/>
            <circle cx="40" cy="10" r="5" fill="${v.dark}"/>
            <circle cx="58" cy="8" r="5" fill="${v.dark}"/>
            <circle cx="40" cy="10" r="2.5" fill="${v.earInner}" opacity="0.5"/>
            <circle cx="58" cy="8" r="2.5" fill="${v.earInner}" opacity="0.5"/>
            <ellipse cx="44" cy="19" rx="4.5" ry="4" fill="${v.dark}" transform="rotate(-15 44 19)"/>
            <ellipse cx="56" cy="19" rx="4.5" ry="4" fill="${v.dark}" transform="rotate(15 56 19)"/>
            <circle cx="44" cy="18" r="2.8" fill="#fff"/>
            <circle cx="56" cy="18" r="2.8" fill="#fff"/>
            <circle cx="44.5" cy="18.5" r="1.8" fill="#111"/>
            <circle cx="56.5" cy="18.5" r="1.8" fill="#111"/>
            <circle cx="43.5" cy="17.5" r="0.8" fill="#fff"/>
            <circle cx="55.5" cy="17.5" r="0.8" fill="#fff"/>
            <ellipse cx="40" cy="24" rx="2.5" ry="1.5" fill="#FFB0B8" opacity="0.35"/>
            <ellipse cx="60" cy="24" rx="2.5" ry="1.5" fill="#FFB0B8" opacity="0.35"/>
            <ellipse cx="50" cy="23" rx="2" ry="1.5" fill="${v.nose}"/>
            <path d="M50 24.5Q47.5 27 45 25.5M50 24.5Q52.5 27 55 25.5" stroke="${v.nose}" stroke-width="1" stroke-linecap="round" fill="none"/>
        </g>
        <ellipse class="animal-pet-leg animal-pet-leg-a" cx="16" cy="42" rx="4" ry="3" fill="${v.dark}"/>
        <ellipse class="animal-pet-leg animal-pet-leg-b" cx="26" cy="42.5" rx="4" ry="3" fill="${v.dark}"/>
        <ellipse class="animal-pet-leg animal-pet-leg-c" cx="37" cy="42" rx="4" ry="3" fill="${v.dark}"/>
        <ellipse class="animal-pet-leg animal-pet-leg-a" cx="46" cy="42" rx="4" ry="3" fill="${v.dark}"/>
    `;
}

class CatAnimation extends AnimalPetAnimation {
    constructor() {
        super({
            id: 'cat',
            nameKey: 'animCat',
            name: 'Kitten Steps',
            icon: '🐱',
            marchDuration: 42,
            renderer: renderCat,
            variants: [
                { face: '#F7B86C', body: '#E99842', belly: '#FFE4B5', ear: '#E99842', innerEar: '#FFD1C8', tail: '#D98433', tailTip: '#FFF0D8', stripe: '#A85B25', nose: '#8D4A34', mouth: '#7A3E2A', whisker: '#6B3A25', paw: '#FFF0D8' },
                { face: '#F6F0E5', body: '#CFC4B7', belly: '#FFFFFF', ear: '#CFC4B7', innerEar: '#F5C7C0', tail: '#A89484', tailTip: '#F6F0E5', stripe: '#7A6A5E', nose: '#8A5B53', mouth: '#5D4037', whisker: '#5D4037', paw: '#FFFFFF' },
                { face: '#34343A', body: '#28282E', belly: '#4A4A50', ear: '#25252B', innerEar: '#B96C86', tail: '#202026', tailTip: '#4B4B54', stripe: '#101014', nose: '#F08AA9', mouth: '#D6CAD0', whisker: '#D6CAD0', paw: '#4A4A50' }
            ]
        });
    }
}

class DogAnimation extends AnimalPetAnimation {
    constructor() {
        super({
            id: 'dog',
            nameKey: 'animDog',
            name: 'Puppy Trot',
            icon: '🐶',
            marchDuration: 38,
            renderer: renderDog,
            variants: [
                { face: '#C9864D', body: '#A86437', chest: '#F2D2A8', ear: '#74482C', tail: '#7B4B2D', muzzle: '#F2D2A8', nose: '#3E2723', mouth: '#3E2723', tongue: '#EF7E91', paw: '#F5D0A9' },
                { face: '#F0D7A9', body: '#D0A06D', chest: '#FFF3D6', ear: '#76503A', tail: '#76503A', muzzle: '#FFF3D6', nose: '#3E2723', mouth: '#3E2723', tongue: '#F08396', paw: '#FFF3D6', patch: '#6D4C41' },
                { face: '#403832', body: '#2F2A26', chest: '#7A6A5F', ear: '#1F1B18', tail: '#1F1B18', muzzle: '#75675D', nose: '#111111', mouth: '#111111', tongue: '#E77C8D', paw: '#6D625B' }
            ]
        });
    }
}

class RedPandaAnimation extends AnimalPetAnimation {
    constructor() {
        super({
            id: 'redPanda',
            nameKey: 'animRedPanda',
            name: 'Red Panda Ramble',
            icon: '🐾',
            marchDuration: 46,
            leaderSize: 50,
            renderer: renderRedPanda,
            variants: [
                { light: '#FAFAFA', dark: '#2A2A2A', earInner: '#555555', nose: '#1A1A1A' },
                { light: '#F0EDE5', dark: '#333333', earInner: '#5A5A5A', nose: '#1A1A1A' },
                { light: '#F5F0E8', dark: '#222222', earInner: '#4A4A4A', nose: '#111111' }
            ]
        });
    }
}
