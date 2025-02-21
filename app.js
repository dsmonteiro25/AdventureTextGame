document.addEventListener('DOMContentLoaded', () => {
    const output = document.getElementById('output');
    const input = document.getElementById('input');

    let currentLocationId;
    let gameData;

    // Carrega o arquivo JSON do jogo
    fetch('game.json')
        .then(response => response.json())
        .then(data => {
            gameData = data;
            startGame();
        })
        .catch(error => console.error('Erro ao carregar o jogo:', error));

    function startGame() {
        currentLocationId = gameData.start_locationId;
        displayLocation(currentLocationId);
        input.focus();
    }

    function displayLocation(locationId) {
        const location = gameData.locations.find(loc => loc.id === locationId);
        if (location) {
            output.innerHTML = `<p><strong>${location.name}</strong></p><p>${location.description}</p>`;
            displayExits(location.exits);
        }
    }

    function displayExits(exits) {
        if (exits.length > 0) {
            output.innerHTML += `<p>Saídas disponíveis:</p>`;
            exits.forEach(exit => {
                if (!exit.inactive) {
                    output.innerHTML += `<p>${exit.direction}: ${exit.description}</p>`;
                }
            });
        }
    }

    input.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            const command = input.value.trim().toLowerCase();
            input.value = '';
            processCommand(command);
        }
    });

    function processCommand(command) {
        const parts = command.split(' ');
        const verb = parts[0];
        const noun = parts.slice(1).join(' ');

        const location = gameData.locations.find(loc => loc.id === currentLocationId);

        if (verb === 'ir') {
            const exit = location.exits.find(exit => exit.direction === noun);
            if (exit && !exit.inactive) {
                currentLocationId = exit.targetLocationId;
                displayLocation(currentLocationId);
            } else {
                output.innerHTML += `<p>Não é possível ir para ${noun}.</p>`;
            }
        } else if (verb === 'olhar') {
            displayLocation(currentLocationId);
        } else {
            output.innerHTML += `<p>Comando não reconhecido: ${command}</p>`;
        }
    }
});