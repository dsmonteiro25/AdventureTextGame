document.addEventListener('DOMContentLoaded', () => {
    const gameContainer = document.getElementById('game-container');
    const gameTitle = document.getElementById('game-title');
    const gameAuthor = document.getElementById('game-author');
    const gameDescription = document.getElementById('game-description');
    const gameLocation = document.getElementById('game-location');
    const commandInput = document.getElementById('command-input');
    const submitCommand = document.getElementById('submit-command');
    const gameLog = document.getElementById('game-log');
    const turnCounter = document.getElementById('turn-counter');

    let gameData;
    let currentLocation;
    let previousLocation = null;
    let inventory = [];
    let turns = 0;
    let playerHP = null;
    let inConversation = false; // Estado para controlar diálogo ativo
    let currentNPC = null; // NPC atual em conversa
    let currentDialogue = null; // Diálogo atual exibido

    fetch('game.json')
        .then(response => response.json())
        .then(data => {
            gameData = data;
            playerHP = gameData.life;
            initializeGame();
        })
        .catch(error => console.error('Erro ao carregar o jogo:', error));

    function initializeGame() {
        gameTitle.textContent = gameData.title;
        gameAuthor.textContent = `Por: ${gameData.author || 'Autor desconhecido'}`;
        gameDescription.textContent = gameData.description;
        currentLocation = gameData.locations.find(loc => loc.id === gameData.startLocationId);
        updateLocation();
        updateTurnCounter();
        logMessage(`Bem-vindo ao ${gameData.title}! Vida inicial: ${playerHP}`);
    }

    function updateLocation() {
        const items = currentLocation.items ? currentLocation.items.map(item => item.name).join(', ') : 'Nenhum item disponível';
        const exits = currentLocation.exits ? currentLocation.exits.map(exit => exit.direction).join(', ') : 'Nenhuma saída disponível';
        const npcs = currentLocation.npcs ? currentLocation.npcs.map(npc => npc.name).join(', ') : 'Nenhum NPC presente';
        const enemies = currentLocation.enemies ? currentLocation.enemies.map(enemy => enemy.name).join(', ') : 'Nenhum inimigo presente';

        gameLocation.innerHTML = `
            <h2>${currentLocation.name}</h2>
            <p>${currentLocation.description}</p>
            <p>Itens: ${items}</p>
            <p>Saídas: ${exits}</p>
            <p>NPCs: ${npcs}</p>
            <p>Inimigos: ${enemies}</p>
            <p>Sua vida: ${playerHP}</p>
        `;
        
        if (currentLocation.enemies && currentLocation.enemies.length > 0) {
            logMessage(`Você encontrou um inimigo: ${currentLocation.enemies[0].name}!`);
        }
    }

    function promptCombatOrFlee(enemy, action) {
        if (action === 'lutar') {
            startCombat(enemy);
        } else if (action === 'fugir') {
            if (previousLocation) {
                logMessage("Você fugiu do combate e voltou para a localização anterior!");
                if (enemy.result && enemy.result.lose_life) {
                    playerHP -= enemy.result.lose_life;
                    logMessage(`A fuga custou ${enemy.result.lose_life} de vida! Sua vida agora é ${playerHP}.`);
                    if (playerHP <= 0) {
                        logMessage("Você sucumbiu aos ferimentos ao fugir. Fim do jogo.");
                        endGame();
                        return;
                    }
                }
                currentLocation = previousLocation;
                updateLocation();
            } else {
                logMessage("Não há para onde fugir!");
            }
        } else {
            logMessage("Comando inválido. Escolha 'lutar' ou 'fugir'.");
        }
    }

    function startCombat(enemy) {
        logMessage(`Combate iniciado contra ${enemy.name}!`);
        let enemyHP = enemy.life || 20;

        while (playerHP > 0 && enemyHP > 0) {
            const enemyAttack = enemy.attack;
            const playerDefense = gameData.defense;

            if (enemyAttack > playerDefense) {
                const damage = enemyAttack - playerDefense;
                playerHP -= damage;
                logMessage(`O inimigo atacou e causou ${damage} de dano!`);
            } else {
                logMessage("Você defendeu o ataque do inimigo sem sofrer dano.");
            }

            logMessage(`Seu HP: ${playerHP} | HP do inimigo: ${enemyHP}`);

            if (playerHP <= 0) {
                logMessage("Você foi derrotado! Fim do jogo.");
                endGame();
                return;
            }

            const playerAttack = gameData.attack;
            const enemyDefense = enemy.defense;

            if (playerAttack > enemyDefense) {
                const damage = playerAttack - enemyDefense;
                enemyHP -= damage;
                logMessage(`Você atacou e causou ${damage} de dano ao inimigo!`);
            } else {
                logMessage("Seu ataque não foi eficaz. O inimigo se defendeu!");
            }

            logMessage(`Seu HP: ${playerHP} | HP do inimigo: ${enemyHP}`);

            if (enemyHP <= 0) {
                logMessage(`Você derrotou o inimigo ${enemy.name}!`);
                currentLocation.enemies = currentLocation.enemies.filter(e => e.id !== enemy.id);
                updateLocation();
                return;
            }

            combatChoice = null;
            while (combatChoice === null) {
                const command = prompt("Deseja 'lutar' ou 'fugir'?").trim().toLowerCase();
                combatChoice = command === 'lutar' || command === 'fugir' ? command : null;
            }

            if (combatChoice === 'fugir') {
                if (previousLocation) {
                    logMessage("Você fugiu do combate!");
                    if (enemy.result && enemy.result.lose_life) {
                        playerHP -= enemy.result.lose_life;
                        logMessage(`A fuga custou ${enemy.result.lose_life} de vida! Sua vida agora é ${playerHP}.`);
                        if (playerHP <= 0) {
                            logMessage("Você sucumbiu aos ferimentos ao fugir. Fim do jogo.");
                            endGame();
                            return;
                        }
                    }
                    currentLocation = previousLocation;
                    updateLocation();
                    return;
                } else {
                    logMessage("Não há para onde fugir! Você deve continuar lutando.");
                }
            }
        }
    }

    function talkToNPC(npcName) {
        const npc = currentLocation.npcs ? currentLocation.npcs.find(n => n.name.toLowerCase() === npcName.toLowerCase()) : null;
        if (npc) {
            if (npc.dialogues && npc.dialogues.length > 0) {
                inConversation = true;
                currentNPC = npc;
                currentDialogue = npc.dialogues[0]; // Usa o primeiro diálogo por simplicidade
                logMessage(`${npc.name}: "${currentDialogue.text}"`);
                if (currentDialogue.responses && currentDialogue.responses.length > 0) {
                    const options = currentDialogue.responses.map((r, i) => `${i + 1}. ${r.text}`).join(' | ');
                    logMessage(`Escolha uma resposta: ${options}`);
                } else {
                    inConversation = false; // Termina a conversa se não houver respostas
                }
            } else {
                logMessage(`Você conversou com ${npc.name}: "${npc.description}"`);
            }
        } else {
            logMessage(`NPC "${npcName}" não encontrado.`);
        }
    }

    function handleDialogueResponse(responseIndex) {
        if (!inConversation || !currentDialogue || !currentDialogue.responses) {
            logMessage("Nenhuma conversa ativa.");
            return;
        }

        const response = currentDialogue.responses[responseIndex];
        if (response) {
            logMessage(`Você: "${response.text}"`);
            if (response.result && response.result.text) {
                logMessage(`${currentNPC.name}: "${response.result.text}"`);
            }
        } else {
            logMessage("Resposta inválida.");
        }
        inConversation = false; // Termina a conversa após a resposta
        currentNPC = null;
        currentDialogue = null;
    }

    function updateTurnCounter() {
        if (gameData.max_turns_normal) {
            const remaining = gameData.max_turns_normal - turns;
            turnCounter.textContent = `Turno: ${turns} / Restantes: ${remaining >= 0 ? remaining : 0}`;
        } else {
            turnCounter.textContent = `Turno: ${turns} / Restantes: ∞`;
        }
    }

    function logMessage(message) {
        const logEntry = document.createElement('p');
        logEntry.textContent = message;
        gameLog.appendChild(logEntry);
        gameLog.scrollTop = gameLog.scrollHeight;
    }

    function processCommand(command) {
        if (inConversation) {
            const responseIndex = parseInt(command) - 1; // Converte a entrada para índice (1-based para 0-based)
            handleDialogueResponse(responseIndex);
            return;
        }

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
            case 'lutar':
            case 'fugir':
                if (currentLocation.enemies && currentLocation.enemies.length > 0) {
                    promptCombatOrFlee(currentLocation.enemies[0], action);
                } else {
                    logMessage("Não há inimigos para lutar ou fugir aqui.");
                }
                break;
            default:
                logMessage('Comando inválido. Tente "mover", "pegar", "usar", "inventario", "falar", "resolver", "lutar" ou "fugir".');
                return;
        }

        turns++;
        updateTurnCounter();

        if (gameData.max_turns_normal && turns >= gameData.max_turns_normal) {
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
                    previousLocation = currentLocation;
                    currentLocation = newLocation;
                    updateLocation();
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
                updateLocation();
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
                updateLocation();
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
                updateLocation();
            } else {
                logMessage(`Você não tem os itens necessários para resolver o quebra-cabeça.`);
            }
        } else {
            logMessage(`Quebra-cabeça "${puzzleId}" não encontrado.`);
        }
    }

    function endGame() {
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
    });
});