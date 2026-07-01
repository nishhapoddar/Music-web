const songListElement = document.getElementById('songList');
const searchToggleButton = document.getElementById('searchToggleBtn');
const songSearchPanel = document.getElementById('songSearchPanel');
const songSearchInput = document.getElementById('songSearchInput');
const playButton = document.getElementById('playBtn');
const nextButton = document.getElementById('nextBtn');
const prevButton = document.getElementById('prevBtn');
const seekBar = document.getElementById('seekBar');
const songInfoElement = document.querySelector('.songinfo');
const songTimeElement = document.getElementById('songTime');
const recentListElement = document.getElementById('recentList');
const libraryNameInput = document.getElementById('libraryNameInput');
const createLibraryButton = document.getElementById('createLibraryBtn');
const librarySelectElement = document.getElementById('librarySelect');
const addToLibraryButton = document.getElementById('addToLibraryBtn');
const libraryListElement = document.getElementById('libraryList');
const selectedLibrarySongsElement = document.getElementById('selectedLibrarySongs');

const RECENT_KEY = 'spotify_clone_recent_songs';
const LIBRARIES_KEY = 'spotify_clone_libraries';

const audio = new Audio();
let songs = [];
let currentIndex = 0;
let isPlaying = false;
let recentSongs = [];
let libraries = [];
let selectedLibraryId = null;
let songSearchQuery = '';

function updateLibraryHighlight() {
	const items = document.querySelectorAll('.song-item');

	items.forEach((item, index) => {
		item.classList.toggle('active', Number(item.dataset.songIndex) === currentIndex && isPlaying);
	});
}

function getSongById(songId) {
	return songs.find((song) => song.id === songId);
}

function getArtistName(song) {
	const artistMap = {
		'Kabhi jo badal barse': 'Arijit Singh',
		'Dheere Dheere': 'Yo Yo Honey Singh',
		'Kabira': 'Arijit Singh',
		'Sangemarmar': 'Arijit Singh',
		'Kai po che': 'Amit Trivedi',
		'Yaariyan': 'Mithoon',
		'Blue eyes': 'Yo Yo Honey Singh',
		'Uff-teri-adaa': 'Shruti Pathak',
		'Janam Janam': 'Arijit Singh',
		'Takdir': 'Rahat Fateh Ali Khan',
		'saaddi gali': 'Lehmber Hussainpuri',
		'sanam re': 'Arijit Singh',
		'Hum tere bin ab reh nhi sakte': 'Mithoon',
	};

	return song.artist || song.artistName || artistMap[song.title] || 'Arijit Singh';
}

function persistRecentSongs() {
	localStorage.setItem(RECENT_KEY, JSON.stringify(recentSongs));
}

function persistLibraries() {
	localStorage.setItem(LIBRARIES_KEY, JSON.stringify(libraries));
}

function syncSelectOptions() {
	librarySelectElement.innerHTML = '';

	if (!libraries.length) {
		const option = document.createElement('option');
		option.value = '';
		option.textContent = 'No libraries yet';
		librarySelectElement.appendChild(option);
		librarySelectElement.disabled = true;
		return;
	}

	librarySelectElement.disabled = false;

	libraries.forEach((library) => {
		const option = document.createElement('option');
		option.value = library.id;
		option.textContent = library.name;
		librarySelectElement.appendChild(option);
	});

	if (!selectedLibraryId || !libraries.some((library) => library.id === selectedLibraryId)) {
		selectedLibraryId = libraries[0].id;
	}

	librarySelectElement.value = selectedLibraryId;
}

function renderRecentSongs() {
	recentListElement.innerHTML = '';

	if (!recentSongs.length) {
		recentListElement.innerHTML = '<li class="empty-state">No songs played yet</li>';
		return;
	}

	recentSongs.forEach((songId) => {
		const song = getSongById(songId);

		if (!song) {
			return;
		}

		const listItem = document.createElement('li');
		listItem.className = 'recent-card';
		listItem.innerHTML = `
			<img class="recent-card-cover" src="${song.cover || 'https://i.scdn.co/image/ab67616d00001e0233bc5d16517fed8db985360c'}" alt="${song.title}">
			<div class="recent-card-copy">
				<strong>${song.title}</strong>
				<span>${getArtistName(song)}</span>
			</div>
		`;
		listItem.addEventListener('click', () => loadSong(songs.findIndex((item) => item.id === songId)));
		recentListElement.appendChild(listItem);
	});
}

function renderLibrarySongs(library) {
	if (!library) {
		selectedLibrarySongsElement.innerHTML = '<div class="empty-state">Select a library to see its songs</div>';
		return;
	}

	const songsInLibrary = library.songIds
		.map((songId) => getSongById(songId))
		.filter(Boolean);

	if (!songsInLibrary.length) {
		selectedLibrarySongsElement.innerHTML = '<div class="empty-state">This library is empty</div>';
		return;
	}

	selectedLibrarySongsElement.innerHTML = songsInLibrary
		.map(
			(song) => `
				<div class="library-song-row">
					<button class="library-play" data-song-id="${song.id}" type="button" aria-label="Play ${song.title}">▶</button>
					<button class="library-song" data-song-id="${song.id}" type="button">
						<span class="library-song-title">${song.title}</span>
						<span class="library-song-artist">${getArtistName(song)}</span>
					</button>
					<button class="library-remove-song" data-song-id="${song.id}" type="button" aria-label="Remove ${song.title} from library">Remove</button>
				</div>
			`
		)
		.join('');

	selectedLibrarySongsElement.querySelectorAll('.library-play').forEach((button) => {
		button.addEventListener('click', (event) => {
			event.stopPropagation();
			const songId = Number(button.dataset.songId);
			const songIndex = songs.findIndex((item) => item.id === songId);

			if (songIndex !== -1) {
				loadSong(songIndex);
			}
		});
	});

	selectedLibrarySongsElement.querySelectorAll('.library-song').forEach((button) => {
		button.addEventListener('click', () => {
			const songId = Number(button.dataset.songId);
			const songIndex = songs.findIndex((item) => item.id === songId);

			if (songIndex !== -1) {
				loadSong(songIndex);
			}
		});
	});

	selectedLibrarySongsElement.querySelectorAll('.library-remove-song').forEach((button) => {
		button.addEventListener('click', (event) => {
			event.stopPropagation();
			const songId = Number(button.dataset.songId);
			const libraryIndex = libraries.findIndex((entry) => entry.id === library.id);

			if (libraryIndex === -1) {
				return;
			}

			libraries[libraryIndex].songIds = libraries[libraryIndex].songIds.filter((entry) => entry !== songId);
			persistLibraries();
			renderLibraries();
		});
	});
}

function renderLibraries() {
	libraryListElement.innerHTML = '';

	if (!libraries.length) {
		libraryListElement.innerHTML = '<div class="empty-state">Create a library to save songs here</div>';
		renderLibrarySongs(null);
		syncSelectOptions();
		return;
	}

	libraries.forEach((library) => {
		const card = document.createElement('div');
		card.className = `library-card${library.id === selectedLibraryId ? ' active' : ''}`;
		card.innerHTML = `
			<div class="library-card-copy">
				<strong>${library.name}</strong>
				<span>${library.songIds.length} songs</span>
			</div>
			<div class="library-card-actions">
				<button class="library-open" type="button">Open</button>
				<button class="library-delete" type="button" aria-label="Delete ${library.name}">Delete</button>
			</div>
		`;

		card.querySelector('.library-open').addEventListener('click', (event) => {
			event.stopPropagation();
			selectedLibraryId = library.id;
			syncSelectOptions();
			renderLibraries();
			renderLibrarySongs(library);
		});

		card.querySelector('.library-delete').addEventListener('click', (event) => {
			event.stopPropagation();
			libraries = libraries.filter((entry) => entry.id !== library.id);
			if (selectedLibraryId === library.id) {
				selectedLibraryId = libraries[0]?.id ?? null;
			}
			persistLibraries();
			renderLibraries();
		});

		card.addEventListener('click', () => {
			selectedLibraryId = library.id;
			syncSelectOptions();
			renderLibraries();
			renderLibrarySongs(library);
		});

		libraryListElement.appendChild(card);
	});

	renderLibrarySongs(libraries.find((library) => library.id === selectedLibraryId) || libraries[0]);
	syncSelectOptions();
}

function addSongToRecent(songId) {
	recentSongs = [songId, ...recentSongs.filter((entry) => entry !== songId)].slice(0, 6);
	persistRecentSongs();
	renderRecentSongs();
}

function createLibrary(name) {
	const trimmedName = name.trim();

	if (!trimmedName) {
		return;
	}

	const newLibrary = {
		id: String(Date.now()),
		name: trimmedName,
		songIds: [],
	};

	libraries = [newLibrary, ...libraries];
	selectedLibraryId = newLibrary.id;
	persistLibraries();
	renderLibraries();
	libraryNameInput.value = '';
}

function addCurrentSongToLibrary() {
	if (!libraries.length) {
		createLibrary('My Library');
	}

	const library = libraries.find((entry) => entry.id === selectedLibraryId) || libraries[0];
	const currentSong = songs[currentIndex];

	if (!library || !currentSong) {
		return;
	}

	if (!library.songIds.includes(currentSong.id)) {
		library.songIds.unshift(currentSong.id);
		persistLibraries();
		renderLibraries();
	}
}

function formatTime(seconds) {
	if (!Number.isFinite(seconds)) {
		return '0:00';
	}

	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = Math.floor(seconds % 60)
		.toString()
		.padStart(2, '0');

	return `${minutes}:${remainingSeconds}`;
}

function setPlayButtonState(playing) {
	playButton.src = playing
		? 'https://img.icons8.com/ios-glyphs/30/pause--v1.png'
		: 'https://img.icons8.com/liquid-glass/50/play.png';
}

function updateNowPlaying() {
	const currentSong = songs[currentIndex];

	if (!currentSong) {
		songInfoElement.textContent = 'No songs loaded';
		songTimeElement.textContent = '';
		return;
	}

	songInfoElement.textContent = `Playing: ${currentSong.title}`;
	updateLibraryHighlight();
	addSongToRecent(currentSong.id);
}

function loadSong(index, shouldPlay = true) {
	if (!songs.length) {
		return;
	}

	currentIndex = (index + songs.length) % songs.length;
	audio.src = songs[currentIndex].file;
	audio.currentTime = 0;
	seekBar.value = 0;
	updateNowPlaying();

	if (shouldPlay) {
		audio.play();
		isPlaying = true;
		setPlayButtonState(true);
		updateLibraryHighlight();
	}
}

function stopSong() {
	audio.pause();
	audio.currentTime = 0;
	isPlaying = false;
	setPlayButtonState(false);
	updateLibraryHighlight();
}

function renderSongs() {
	songListElement.innerHTML = '';

	const normalizedQuery = songSearchQuery.trim().toLowerCase();
	const visibleSongs = songs
		.map((song, index) => ({ song, index }))
		.filter(({ song }) => {
			if (!normalizedQuery) {
				return true;
			}

			const searchableText = `${song.title} ${getArtistName(song)}`.toLowerCase();
			return searchableText.includes(normalizedQuery);
		});

	if (!visibleSongs.length) {
		songListElement.innerHTML = '<li class="empty-state">No songs matched your search</li>';
		return;
	}

	visibleSongs.forEach(({ song, index }) => {
		const listItem = document.createElement('li');
		listItem.className = 'song-item';
		listItem.dataset.songIndex = String(index);
		listItem.innerHTML = `
			<img class="song-cover" src="${song.cover || 'https://i.scdn.co/image/ab67616d00001e0233bc5d16517fed8db985360c'}" alt="${song.title}">
			<button class="song-play" type="button" aria-label="Play ${song.title}">▶</button>
			<div class="song-copy">
				<strong class="song-title">${song.title}</strong>
					<span class="song-artist">${getArtistName(song)}</span>
			</div>
		`;
		listItem.querySelector('.song-play').addEventListener('click', (event) => {
			event.stopPropagation();
			loadSong(index);
		});
		listItem.addEventListener('click', () => loadSong(index));
		songListElement.appendChild(listItem);
	});

	updateLibraryHighlight();
}

function toggleSongSearchPanel() {
	songSearchPanel.classList.toggle('open');

	if (songSearchPanel.classList.contains('open')) {
		songSearchInput.focus();
	}
}

playButton.addEventListener('click', () => {
	if (!songs.length) {
		return;
	}

	if (!audio.src) {
		loadSong(currentIndex);
		return;
	}

	if (isPlaying) {
		audio.pause();
		isPlaying = false;
		setPlayButtonState(false);
	} else {
		audio.play();
		isPlaying = true;
		setPlayButtonState(true);
	}
});

nextButton.addEventListener('click', () => loadSong(currentIndex + 1));
prevButton.addEventListener('click', () => loadSong(currentIndex - 1));

audio.addEventListener('timeupdate', () => {
	if (Number.isFinite(audio.duration) && audio.duration > 0) {
		seekBar.value = String((audio.currentTime / audio.duration) * 100);
	}

	songTimeElement.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
});

audio.addEventListener('loadedmetadata', () => {
	seekBar.value = 0;
	songTimeElement.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
});

seekBar.addEventListener('input', () => {
	if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
		return;
	}

	audio.currentTime = (Number(seekBar.value) / 100) * audio.duration;
});

audio.addEventListener('ended', () => loadSong(currentIndex + 1));

audio.addEventListener('play', () => {
	isPlaying = true;
	setPlayButtonState(true);
	updateLibraryHighlight();
});

audio.addEventListener('pause', () => {
	isPlaying = false;
	setPlayButtonState(false);
	updateLibraryHighlight();
});

createLibraryButton.addEventListener('click', () => {
	createLibrary(libraryNameInput.value);
});

libraryNameInput.addEventListener('keydown', (event) => {
	if (event.key === 'Enter') {
		event.preventDefault();
		createLibrary(libraryNameInput.value);
	}
});

addToLibraryButton.addEventListener('click', addCurrentSongToLibrary);

searchToggleButton.addEventListener('click', toggleSongSearchPanel);

songSearchInput.addEventListener('input', () => {
	songSearchQuery = songSearchInput.value;
	renderSongs();
});

songSearchInput.addEventListener('keydown', (event) => {
	if (event.key === 'Escape') {
		songSearchInput.value = '';
		songSearchQuery = '';
		renderSongs();
		songSearchPanel.classList.remove('open');
	}
});

librarySelectElement.addEventListener('change', () => {
	selectedLibraryId = librarySelectElement.value;
	renderLibraries();
});

fetch('songs.json')
	.then((response) => {
		if (!response.ok) {
			throw new Error(`Failed to load songs.json: ${response.status}`);
		}

		return response.json();
	})
	.then((data) => {
		songs = data;
		recentSongs = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
		libraries = JSON.parse(localStorage.getItem(LIBRARIES_KEY) || '[]');
		renderSongs();
		renderRecentSongs();
		renderLibraries();

		if (songs.length) {
			updateNowPlaying();
		}
	})
	.catch((error) => {
		console.error(error);
		songInfoElement.textContent = 'Could not load songs.json';
	});