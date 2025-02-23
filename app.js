document.addEventListener('DOMContentLoaded', () => {
    const gameContainer = document.getElementById('game-container');
    const gameTitle = document.getElementById('game-title');
    const gameDescription = document.getElementById('game-description');
    const gameLocation = document.getElementById('game-location');
    const commandInput = document.getElementById('command-input');
    const submitCommand = document.getElementById('submit-command');
    const gameLog = document.getElementById('game-log');
    const turnCounter = document.getElementById('turn-counter'); // Referência ao contador de turnos

    let gameData;
    let currentLocation;
    let inventory = [];
    let turns = 0; // Variável para contar os turnos

    // Carregar o arquivo JSON
    fetch('game.json')
        .then(response => response.json())
        .then(data => {
            gameData = data;
            initializeGame();
        })
        .catch(error => console.error('Erro ao carregar o jogo:', error));

    function initializeGame() {
        gameTitle.textContent = gameData.title;
        gameDescription.textContent = gameData.description;
        currentLocation = gameData.locations.find(loc => loc.id === gameData.startLocationId);
        updateLocation();
        updateTurnCounter(); // Atualiza o contador de turnos ao iniciar o jogo
        logMessage(`Bem-vindo ao ${gameData.title}!`);
    }

    function updateLocation() {
        // Verifica se as propriedades existem antes de acessá-las
        const items = currentLocation.items ? currentLocation.items.map(item => item.name).join(', ') : 'Nenhum item disponível';
        const exits = currentLocation.exits ? currentLocation.exits.map(exit => exit.direction).join(', ') : 'Nenhuma saída disponível';
        const npcs = currentLocation.npcs ? currentLocation.npcs.map(npc => npc.name).join(', ') : 'Nenhum NPC presente';

        gameLocation.innerHTML = `
            <h2>${currentLocation.name}</h2>
            <p>${currentLocation.description}</p>
            <p>Itens: ${items}</p>
            <p>Saídas: ${exits}</p>
            <p>NPCs: ${npcs}</p>
        `;
    }

    function updateTurnCounter() {
        turnCounter.textContent = `Turno: ${turns}`; // Atualiza o texto do contador de turnos
    }

    function logMessage(message) {
        const logEntry = document.createElement('p');
        logEntry.textContent = message;
        gameLog.appendChild(logEntry);
        gameLog.scrollTop = gameLog.scrollHeight;
    }

    function processCommand(command) {
        const parts = command.split(' ');
        const action = parts[0];
        const target = parts.slice(1).join(' ');

        switch (action) {
            case 'mover':
            case 'ir':
                moveToLocation(target);
                break;
            case 'pegar':
                pickUpItem(target);
                break;
            case 'usar':
                useItem(target);
                break;
            case 'inventario':
                showInventory();
                break;
            case 'falar':
                talkToNPC(target);
                break;
            case 'resolver':
                solvePuzzle(target);
                break;
            default:
                logMessage('Comando inválido. Tente "mover", "pegar", "usar", "inventario", "falar" ou "resolver".');
                return; // Não incrementa o turno se o comando for inválido
        }

        turns++; // Incrementa o contador de turnos
        updateTurnCounter(); // Atualiza o contador na interface

        // Verifica se o jogador ultrapassou o limite de turnos
        if (turns >= gameData.max_turns_normal) {
            logMessage("Você demorou demais e não conseguiu escapar. Fim do jogo!");
            endGame();
        }
    }

    function moveToLocation(direction) {
        const exit = currentLocation.exits ? currentLocation.exits.find(e => e.direction.toLowerCase() === direction.toLowerCase()) : null;
        if (exit) {
            if (exit.inactive) {
                logMessage(`A saída para ${exit.direction} está bloqueada.`);
            } else {
                const newLocation = gameData.locations.find(loc => loc.id === exit.targetLocationId);
                if (newLocation) {
                    currentLocation = newLocation;
                    updateLocation(); // Atualiza a interface para a nova localização
                    logMessage(`Você se moveu para ${currentLocation.name}.`);
                } else {
                    logMessage(`Localização "${exit.targetLocationId}" não encontrada.`);
                }
            }
        } else {
            logMessage(`Não há uma saída na direção ${direction}.`);
        }
    }

    function pickUpItem(itemName) {
        const item = currentLocation.items ? currentLocation.items.find(i => i.name.toLowerCase() === itemName.toLowerCase()) : null;
        if (item) {
            if (item.can_take) {
                inventory.push(item);
                currentLocation.items = currentLocation.items.filter(i => i.id !== item.id);
                updateLocation(); // Atualiza a interface após pegar o item
                logMessage(`Você pegou o item: ${item.name}.`);
            } else {
                logMessage(`Você não pode pegar o item: ${item.name}.`);
            }
        } else {
            logMessage(`Item "${itemName}" não encontrado.`);
        }
    }

    function useItem(itemName) {
        const item = inventory.find(i => i.name.toLowerCase() === itemName.toLowerCase());
        if (item) {
            const puzzle = currentLocation.puzzles ? currentLocation.puzzles.find(p => p.solution.requiredItems.includes(item.id)) : null;
            if (puzzle) {
                logMessage(`Você usou o item: ${item.name}.`);
                puzzle.result.active.forEach(exitId => {
                    const exit = currentLocation.exits.find(e => e.targetLocationId === exitId);
                    if (exit) exit.inactive = false;
                });
                if (puzzle.result.lose_item) {
                    inventory = inventory.filter(i => i.id !== item.id);
                }
                updateLocation(); // Atualiza a interface após usar o item
                logMessage(`Quebra-cabeça resolvido! Saídas desbloqueadas.`);
            } else {
                logMessage(`Você não pode usar o item ${item.name} aqui.`);
            }
        } else {
            logMessage(`Item "${itemName}" não encontrado no inventário.`);
        }
    }

    function showInventory() {
        if (inventory.length > 0) {
            logMessage(`Inventário: ${inventory.map(item => item.name).join(', ')}`);
        } else {
            logMessage('Seu inventário está vazio.');
        }
    }

    function talkToNPC(npcName) {
        const npc = currentLocation.npcs ? currentLocation.npcs.find(n => n.name.toLowerCase() === npcName.toLowerCase()) : null;
        if (npc) {
            logMessage(`Você conversou com ${npc.name}: "${npc.description}"`);
        } else {
            logMessage(`NPC "${npcName}" não encontrado.`);
        }
    }

    function solvePuzzle(puzzleId) {
        const puzzle = currentLocation.puzzles ? currentLocation.puzzles.find(p => p.id === puzzleId) : null;
        if (puzzle) {
            const hasRequiredItems = puzzle.solution.requiredItems.every(itemId =>
                inventory.some(item => item.id === itemId)
            );
            if (hasRequiredItems) {
                logMessage(`Você resolveu o quebra-cabeça: ${puzzle.description}.`);
                puzzle.result.active.forEach(exitId => {
                    const exit = currentLocation.exits.find(e => e.targetLocationId === exitId);
                    if (exit) exit.inactive = false;
                });
                if (puzzle.result.lose_item) {
                    puzzle.result.lose_item.forEach(itemId => {
                        inventory = inventory.filter(item => item.id !== itemId);
                    });
                }
                updateLocation(); // Atualiza a interface após resolver o quebra-cabeça
            } else {
                logMessage(`Você não tem os itens necessários para resolver o quebra-cabeça.`);
            }
        } else {
            logMessage(`Quebra-cabeça "${puzzleId}" não encontrado.`);
        }
    }

    function endGame() {
        // Desabilita o campo de entrada e o botão
        commandInput.disabled = true;
        submitCommand.disabled = true;
        logMessage("Fim do jogo. Recarregue a página para jogar novamente.");
    }

    submitCommand.addEventListener('click', () => {
        const command = commandInput.value.trim().toLowerCase();
        commandInput.value = '';
        if (!command) return;

        logMessage(`> ${command}`);
        processCommand(command);
    });

    commandInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const command = commandInput.value.trim().toLowerCase();
            commandInput.value = '';
            if (!command) return;

            logMessage(`> ${command}`);
            processCommand(command);
        }
    })
});