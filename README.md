# 🎮 Pac-Man 3D (FSM)

## 🧾 About
A 3D first-person Pac-Man-style game built with **JavaScript + Canvas**.  
It includes **Finite State Machine (FSM) ghost AI**, a minimap, power-ups, and a health system.

---

## 🎮 Gameplay
- Collect pellets to increase score  
- Avoid ghosts or lose health (-25 per hit)  
- Lose a life when HP reaches 0  
- Use power-ups:
  - 🍌 Banana → resets ghosts to center  
  - ⚡ Energy Drink → speed boost +10 HP  
  - 💊 Pill → allows you to eat ghosts for 30 seconds  

### 💊 Pill Mechanic
- After collecting a pill, you enter a **30-second power mode**
- During this time:
  - All ghosts turn **dark blue**
  - You can **eat ghosts**
  - Eating a ghost:
    - Gives **+200 score**
    - Restores **full health**
    - Sends the ghost back to spawn
- After 30 seconds, ghosts return to normal behavior

---

Ghosts use FSM behavior:
- **CHASE** → follow player  
- **PATROL** → random movement  
- **SCATTER** → move to fixed point  

---

## ⌨️ Controls

W / S → Move  
A / D → Turn  
P → Pause  
R → Restart  

---

## 📁 Structure

PetSimulator/  
├── index.html  
├── css/style.css  
├── js/main.js  
└── assets/sounds/  
