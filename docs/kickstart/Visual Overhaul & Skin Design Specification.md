# **Visual Overhaul & Art Direction Specification**

**Project:** District: Common Ground

**Document:** Visual Polish, Skin Pipeline & UI/UX Transformation

**Target Audience:** All ages (Cozy, warm, readable, engaging from Second 1\)

**Instruction Target:** Autonomous Coding Agent (Aider / Claude / Gemini)

## **1\. Tooling & AI Division of Labor**

To achieve commercial-grade visual quality with your subscriptions:

| Role | Best Tool | Responsibilities |
| :---- | :---- | :---- |
| **Engine Code & Shader/Canvas Refactoring** | **Aider \+ Claude 3.5/3.7 Sonnet** | Updating canvas camera zoom, implementing procedural autotiling, lighting overlays, particle effects, and responsive CSS overlays. |
| **Narrative, Logic & Balancing** | **Gemini (Advanced)** | Large-context crisis writing, mathematical tuning of the commons economy, scenario generation. |
| **Sprite & Tileset Asset Generation** | **Recraft.ai / Scenario.gg / Leonardo.ai** (or Midjourney v6 with pixel-art prompt) | Generating crisp 16x16 / 32x32 top-down tilesets, character sprite sheets (walk cycles), and icon sets with transparent PNG backgrounds. |
| **Quick Code Assist & Snippets** | **GitHub Copilot** | Inline autocompletion inside VS Code / WebStorm during manual tweaks. |

## **2\. Forensic Diagnosis of the Current Screen**

Looking directly at the current build screenshot, five critical issues create the "uninviting" feel:

1. **Camera Scale (The "Ant Farm" Problem):**  
   The camera is zoomed out 4x too far. The player avatar and NPCs are tiny 12-pixel specks lost inside massive dark voids. *Zelda: Link's Awakening* and *Pokemon* work because the camera view is tight: only ![][image1] or ![][image2] tiles are visible at any time. The avatar must command visual attention.  
2. **Muddy Black-Hole Interiors:**  
   The buildings are completely black empty boxes bordered by monotone brick outlines. Rooms need flooring (wood planks, warm rugs, tiles), furniture (counters, plants, shelves), and windows casting sunlight.  
3. **Desaturated "Mud" Color Palette:**  
   A pure grey/black palette registers as depressing or broken. Even games dealing with poverty or crisis (like *A Short Hike*, *Spiritfarer*, or *Celeste*) use rich ambient hues (warm ochre, slate-blue, terracotta, moss green).  
4. **Lack of "Juice" and Life:**  
   No ambient shadows under characters, no wind blowing leaves, no warm light halos around streetlamps, and no bouncing speech or exclamation bubbles (\!).  
5. **Microscopic UI:**  
   The bottom icons and top bars are too small to touch on mobile and hard to read on desktop.

## **3\. The 4-Pillar Visual Transformation**

\[CURRENT SCREEN\]                                  \[NEW COZY TARGET\]  
\- Giant black voids                         \==\>   \- Tight camera zoom (Player \= 10% screen height)  
\- Monotone dark grey                        \==\>   \- Warm Ghibli/Solarpunk or crisp Game Boy palette  
\- Static empty boxes                        \==\>   \- Detailed interior props (rugs, radios, plants)  
\- Tiny unreadable icons                     \==\>   \- Bouncy, accessible floating UI cards  
\- Dead atmosphere                           \==\>   \- Soft dynamic lighting \+ floating particles

### **3.1 Camera & Viewport Overhaul**

* **Base Resolution / Zoom Factor:**  
  Set the virtual canvas view to ![][image3] or ![][image4] pixels, then integer-scale up to fit the window with smooth camera smoothing (lerp \= 0.1).  
* **Visible Area:**  
  A maximum of ![][image5] tiles on screen at any moment. When the player walks into a room, the camera smoothly pans to center on that room.

## **4\. Visual Palettes & Thematic Skins**

### **Skin A (Default): "Warm Solarpunk / Wholesome District"**

Designed to be instantly welcoming to kids, families, and casual players:

* **Ground / Streets:** Warm sunlit cobblestone (\#e2d7c5), lush sidewalk clover/grass (\#7fa655), warm brickwork (\#c46d4e).  
* **Buildings:** Cozy stucco facades (\#fff3df), teal and terracotta roofs (\#3c7a89, \#d35400), warm lit windows (\#ffeaa7).  
* **Character Avatars:** Cute, readable silhouettes with expressive hair/hats, distinct bounce on every step, and subtle drop shadows (rgba(0,0,0,0.25)).

### **Skin B (Retro Civic): "Game Boy Pocket Classic"**

Clean, nostalgic, high-contrast 4-color palette for retro enthusiasts:

* **Shade 0 (Highlight):** \#e0f8cf (Bright mint)  
* **Shade 1 (Surface):** \#86c06c (Light sage)  
* **Shade 2 (Shadow):** \#306850 (Forest pine)  
* **Shade 3 (Deep Outline):** \#071821 (Ink black)

## **5\. Tilemap & Level Design Improvements**

### **5.1 Interior Furnishing Rules**

No empty rooms. Every room must have at least 3 recognizable props:

* **Pip's Courier Room:** A bicycle rack, sleeping cot with blanket, cardboard boxes, glowing desk lamp.  
* **Community Kitchen:** Long wooden table with soup bowls, bubbling stove pot, crates of carrots/apples.  
* **Town Assembly:** Wooden benches, chalkboard with voting tallies, community banner hanging on the back wall.

### **5.2 Dynamic Environmental Feedback (The "Resilience" State)**

The visual state of the district must physically transform as the player builds community resilience:

| Resilience Score | Street Ground | Buildings | Ambient Lighting |
| :---- | :---- | :---- | :---- |
| **![][image6] (Grim Squeeze)** | Cracked asphalt, trash piles, puddle tiles | Boarded-up shop fronts, barbed wire, shuttered blinds | Desaturated tint, grey rain particles, flicking streetlamps |
| ![][image7] **(Organizing)** | Cleaned sidewalks, wooden market stalls | Open doors with warm yellow indoor light spilling out | Neutral warm daylight, bunting flags between lampposts |
| ![][image8] **(Flourishing Commons)** | Cobblestone with flower planters, outdoor cafe tables | Rooftop solar panels, vertical herb gardens, murals | Golden hour sunlight, floating pollen/leaf particles, birds |

## **6\. UI/UX "Juice" & Accessibility Spec**

1. **Floating Interactive Prompts (Above Heads):**  
   Whenever an NPC or building is interactable, display a gently bobbing bubble (💬, 🔧, 📦) over them with a slight drop shadow.  
2. **Dialogue Box Upgrade:**  
   Replace small dark text with a cozy bottom dialogue card:  
   * Left side: Animated avatar portrait with facial expressions (Happy, Tired, Determined).  
   * Right side: High-contrast 16px text with crisp typography (e.g., *Inter* or *Silkscreen* font).  
3. **The "Radio Free Commons" Widget:**  
   The radio widget at the bottom right has great flavor—turn it into an attractive retro boombox or tape deck with an animated pulsing waveform that bounces to the Web Audio synth.

## **7\. Direct Agent Task List (Instructions for Aider)**

Pass this prompt directly into **Aider** (configured with Claude 3.5/3.7 Sonnet):

\#\#\# AGENT TASK: TILEMAP & VISUAL RENDERING OVERHAUL

1\. \*\*Camera Zoom & Framing:\*\*  
&nbsp;&nbsp;&nbsp;\- In the canvas renderer, change the camera scale so only 12x10 tiles are visible in the viewport.  
&nbsp;&nbsp;&nbsp;\- Attach a smooth Lerp camera follower to the player avatar with slight horizontal/vertical deadzones.

2\. \*\*Palette & Contrast Replacement:\*\*  
&nbsp;&nbsp;&nbsp;\- Replace the pure black (\#000000) and dark asphalt tones with warm slate and cobblestone tones (\#2b2d42 for shadows, \#8d99ae for road borders, \#edf2f4 for highlights).  
&nbsp;&nbsp;&nbsp;\- In building interiors, replace the empty black voids with patterned wooden floor tiles (\#8B5A2B and \#A0522D) or tiled linoleum.

3\. \*\*Lighting & Shadow Layer:\*\*  
&nbsp;&nbsp;&nbsp;\- Add a Canvas 2D blend mode layer ('multiply' or 'overlay').  
&nbsp;&nbsp;&nbsp;\- Render a soft circular gradient around the player and every doorway/window (warm light: rgba(255, 220, 150, 0.4)).  
&nbsp;&nbsp;&nbsp;\- Render a simple ellipse drop-shadow (rgba(0, 0, 0, 0.3)) beneath the player and every NPC sprite.

4\. \*\*Sprite Scaling & Animation:\*\*  
&nbsp;&nbsp;&nbsp;\- Render the player and NPCs at 32x32 pixel resolution (or scale up 16x16 with image-rendering: pixelated).  
&nbsp;&nbsp;&nbsp;\- Add a 2-frame walking bob (oscillate Y offset by 2px every 150ms while moving).

5\. \*\*Interactable Indicators:\*\*  
&nbsp;&nbsp;&nbsp;\- Any entity with collision trigger \<= 48px must draw an animated bouncing icon bubble 16px above its bounding box.  


[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADgAAAAZCAYAAABkdu2NAAACKUlEQVR4Xu2WP0scURTFZxGENCoh1bD/2WoJCYuNiBK10CZgkZjCNo1JiCjY2qylfgRLIUU+ghYaSLOI7AY1CbgWUYSQIqtCEhZEz5U78PbuvTsWUSzeDw47c9557907jxk2CDwez70ik8ksZLPZN9KPwPgidAb9gV7L8bsgmUw+xN4n0CV0mM/ne2WmBYQ+QE2eQHorMwT8fWjdud+FPruZ26ZYLHZTc46V4JpLjmdjNVgoFHpoTPrk4cT7pH9bYL+G9FKp1GP4F9JXsRqEV7UahFalL8nlck+k56LtqcEPtOUVwtpPtdpUOjRIftsili9B5js0KH0C/iaKnpS+BrK/ec8Nx2vgFIfdnAlP/u8NEsgdoJER10un01vwX7heDF3RnqwG1nguQyY86Z3htzVi+RbI1qFRukazn1DcK5mJA6cVOg2S9mTGhCZg0/earzVi+Z3gJrehaTkWBx7KBOb95etn0f5QTWZVKIwGZzVfa8TyO4H8DlTHx2FcjsWh7YV6f2i+CgXxZOYU/1xbhBv8Kn0Lag4FvaRr7PMF92MyY4F5U1oNBNc9IP02ODgvfXpXtMXJw1i/9DXc5iKoSfnhscD8klYDYfkthGH4iE9kRY4R3PyMc798o4WD60Yq1tcOa9QwNiR9Da6vLLwyVHW9FjD4EfoFHUNH/PsTaro5/Ad8wE1WqCjoH+yEm7GIOyWstSQ9C2RPqQ7oG/+uyYzH4/F4PJ4guAJ5P8G4ksgmTgAAAABJRU5ErkJggg==>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADgAAAAZCAYAAABkdu2NAAACV0lEQVR4Xu2WvWsUURTFFyW2FkaE/ZrdZav1C1zSiIUxEBsxhIigjWCnoiiI/gHBLoWNTUqbQGJhI2IKSVKaD0iChaCCxCYK2ikEUc/RO3A9+2Z2JUQs3g8uM+/cM+/dO/NmdguFSCTyX5Ekye1arXZF9RTkZuH5gfiMuKz5f0Gr1dqDOhZYB+vRfAcwTiG2rHDGVfUQ5trtdh/PMfEF835Q306C9Y5x3UajsZfjSqUywLH6MslqENrTarX6WLQn9GORs17fSay+1YC27rVMchr8xhyaPJdqOD9o/k3vDVGv14+o5gmtqTSbzf223qTXMV6m7rVMshosl8sl6A+9hm160vzLXg8BzyvEcdUJ9DnMNaK6As8lrofjfa9De77tBkPgCT6jH1v0kOZCwPuaN8VrmGMe+pjXssAuSKw+fYLvqJdKpX1eD2ITXFM9wG7zLmoiD/jfIAZ5zi8hGjyvnjy4Jq5bU43BD47Xg9CIRa+rrsD3Nelha4awJpcQFzXXDdQ2xBr5U2HjuxivU8Nwl9g7sQZvqO6B5yXu4rTqvYLrV9gkttyw5noB1x3g7x/rwLfhMI5vrcHu0IiLb6qegvwjxD3RNvw4DzaXfom51TA+pZ6/hTUjvqsexBq8pTpBYXdq8i+HdxPXPPBaFr65FDapH548rJk/npZpo14LUiwW+808obl074cCBZ5WvwLPC8xxRnWCOVaRO6F6CFvzixvzXf7kPR3AMIP4iHiP2LDjJmLLeX41E4pCDy93t6eEecZVC4Edc9TWZZ28uQvqiUQikUgk8puf5zrEYwEhVYkAAAAASUVORK5CYII=>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFcAAAAZCAYAAABEmrJwAAADwUlEQVR4Xu1YS2gUQRCNJuJFRZSosEl6kqzuQfGT4A8FBQVFQUS95CZeNAdPimAO3sQcFFTMKYgoImIUcvCDn5MejIhCQEFU8BM1ifgFJSTm46vd6lCpqdmYwOZiPyhm+tWr7urame6eLSoKCAgICJhwVFZWLnHOfYUNwdqiKJqpNQTwd1jzHbZH+wllZWXpioqKR6y7p/0TBeTaiPH/wPpxf177DZRQzpok0FxhndxXo/YnAuJ9CDrt27i/yIWpkTriamtrp9A9YupY81lqwK+TCaK9NCnhQgJj/vT5p1Kp2Zxr3jzg77U04Fpgn0Sb6vNNahJhDaw53N/C09iqNDdIU15evk1wQyhovdL1wdokV0hg/JUYrzuTyUz3HHJcznN6KrUe4Bswv/e6DuwjrkRzGGez5ExA+EF3yonI4vZTGwns8hzuF7Kum9rV1dVzqE1XryFEvJRIzgI0BzUngaVrruYs0GvLeT2TvJ6TQDEX9qr2o6+TmiNwX681PyoQ1MDBWzyHdTSF9gWpw8DrWfeE2kjwiJUI+HMWrwHdWqcK4lFVVbUAvo+aTwK0Lel0eobiKNdYHuB6+Borrsu9dVaM2VdeoGDbKQjXU9qngWLcJi1euUXcbrUGBNdk8RbQxwaM/VJyeGIziO+U3FiB+NVckBbJY7z9NGfWWMU1i5jEJwLi4xjoCq4DNEntVyjmAR57ArH3rQHphyKenn7ts4CxN0L/iu65sF1aM1ZwroMGP7whu0IW14OXAAq+rn0e8PU4Xg4Ed8kaENwZ5kdsCvngC+zUaWQ8QB/XYAMG/0O1C19cQr5g8M/pCdd80poL7qzF5wP0NbAu2BvtGwuQ516nish8HWy35Jxd3OxGLjnmE+szAhANwJoVlw2mTUbxlMBRxXXQFdo1FDPe04KHyxU2u8ZiWVjhxrMrF2XHXYXYt5LzeSDXY7h/oCx7zvVt1t+1cmddbJkZAQh2slD/Yp4r9hwSOhSpMywdj6Br8m2O2yE1aP9y/3johm6ZEwd2AhU4UpvcaIB+Hvpp17yepwSNq/3cTyyG53lA8zGQEMeWqb6NySzm4Jueow2OuZghgU1CRyeIft8GJrEmEpwJOnVA+07zBP4IeKH5BGQ/YxPsoRZ7uNxXnVXIQczrsmhvtXQmsIHNog7YvnASw08jQSQXM7gnK2077LfjNYw2J+lPArQnNCeBPOdrzgL6adY5esNvfFjro9yHQrfLfUx1uNx/CL1Sg3YfvT0ut2QMlZaWTpP+gICAgICAgICAgP8FfwFynIRxljuwbwAAAABJRU5ErkJggg==>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFcAAAAZCAYAAABEmrJwAAADyElEQVR4Xu2XSWhUQRCGJyoquOAWRjIz6UkmOhhcSMAlqBf1FBDUqBf1IAgKxoMgght6U0EPCp5yErxoiAuINw/uChIQI4qKUTQmEQWXiJFs/jWvOpaVfpM3grnYHxTz+q+/u6srL2/exGIej8fjGXHKysoWGGM+IQYQ99Pp9BTtIaAfYU8f4qDOa+BZR36tjwSo9Rj27kH04vqszkvgqYXnvNYl8GxC/OTz79R5J1h0B8yn7RjX53iBaunD+DpihRgfQHyRHg2vM+LNpbps/YlEYrqrjtLS0r3Qvtkc+nBB5iXId8D/QIy/Imqkx4lrY4c2CuNOMc5BnmQymdA6QQU51vnnoEmLqdZsNjvJaqlUaiHX0iy9FsqFNRf6TXkGXK+lMf1xpM8JjO90A3RTsMEa7SG4qLTWsfFqyLv1OvmAb4/WJHh0xbXmIh08DmjfFqnnq4XP4Wwu5XCeLUqrkuPIYOJ+LqTWavF4fIItDndBhn1z8hTbzZ+hB9LgAMuMaoilvLx8NnJtWg8D3saKiorJSguthXRXc1HTUcrRowXDIrpptCcy9g7F5ymdg37JFohoRnRpDwH9NT5G83XogVyg+JXY+7nUcMdmsUa71AoF82u4lkadIyjnai70Tsqhrl2IzZlMJoVxN+Ku9uYFE07QBvjso0PqPIFci20YBZ6382Qed/VyzD0s/Dmf9AwH5q/CnBd0zY3t0J5C4Tr6tW7h/JDG2/pR0w0hF7FeJ7Ro0BcUT74qdYy/Y5MNdE13l924uLh4ovD0/J7xd80lbIMRH3SuULBGE6JP6xKusylEH6DHkkuXWmT0ZBO8nt2WHn5Gku8Jex6j6eOlR68TFcypNsHbRqvOFQLq2Y41Pmtdw3VedOitrvojn8sEPwgalJabTA20Y/tFpnyH7Cb4vOWI3Dp8Xa/nuzBBY3PPWDwWFuH6pfZEAY1dYoLn/yC2Vg3pOOtlrWON46459lxa/wMY6lxGoQ1+MWHz9dLD+jaT5/CutfMBbxXivdSowfpLbjjgn4l1Hmk9rBbSMeeK1mP8fMXbQlKKfK5XUnNCRry2jLNjHGY+T75mNTR2o6sw0iorK8dq3cLrDJnnAv8Zc+F9o3WCfwQ803oIY+y+jrinzVQ/5+7oHAH9qRFvK+jFUvLH+MbLC77ApsHcz/GRNzqjffjLbuVcF6KXrktKSmZoH2GC3+DtiLcc9EpzUvskw+VR5yytucA6DVznkMAZ9glfvQnO22aCGunHFD3nf8j12PuQ16CfvfRfPFV7PB6Px+PxeDye/4FfJyx1r22POZUAAAAASUVORK5CYII=>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEIAAAAZCAYAAACFHfjcAAACUElEQVR4Xu2WP2hTYRTFa4uDS+lQENIkL4FslS7ZxEEr6CJ1qBTasV1sS0WhuHUSJ13dOrkI6tBFxLq0govV0hb/ILRTu7QdBAWVUNBz4XtwOe/elxfQTN8PDsk79+Tmfvc1aXp6IpFIpAOSJFms1Wqz7KegtorMH+gbNM31btJuVtSXoO/QT2iG6xkQegK1wgFFc5wRpNZsNk/LcwwwGbJHnPufdDDrZ+i1uv4IvdWZXLzm8F5Wq9UV8l5IvlKpjGm/W3izNhqNfqmxLx5u4AD7Jl5zeCdSwzJupB6eD4f8oc5a1Ov1EfY01nu2I2fWLW8R0DL7Jl7zcrk8BP+x9rDdiyH/QfsWyHyFzrMvwF9Dr+vst8ObNfjeIjK+idfcAn8RrySPj8Y5rlkguyvL0x56rMMf115RvFm9A3u+SQjPs2/QF7IbXMgD+T3okjzHUt5gEROcKYo3q3dgzzeRIIZbYJ9B7ldS4CNhEZbxHpriWid4s3oH9nyT0PwW+xpkPuFuPmW/KHj9piwDX6BXuNYJ3qzegT3fRII45G32U1B/Dt0nb19f5yFLSP/z4H12cD3KmaJ4s8L/YR04LOIL+yah+R32BRzgbo1+yeGunsVrHmnPQy8hRZbBX6BF8WaV7x1vEag12c9QKpUGw9Yecg0NLodaRhjmKucZZN6hxzX2BfTYRu0C+3nkzSqEuW6q6wfi6UwGBJ5Bx9ABtB8eD6GWysibmkK5V7UzaXfX0eceexZJgVkF/O45I7PJDcDjNvQb9imdiUQikUgkEvkX/AVsbegKtQbYOQAAAABJRU5ErkJggg==>

[image6]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAAAWCAYAAABXEBvcAAACE0lEQVR4Xu2XPUtcURCG3ZgQJEGDsiyyH3e/OlHEVUSS2AQJYhAimiIh2FmKnWCpWApiZyXYqI1WioQ0aWPKJSCB5B9YCEIg7Jpn4BwcJmZ3S733PjDsmXfmFOdl7rl329piYu4VhUIhlcvl+qyuqVQqj6wWA/l8/msQBHsYuMjvha0LmUymg9q11UNPKpV6gkGf5PDEGVJC19F6tTGsPxOXxHdiipgkfkpPNpt9qfeGHqYmLQeX6ZE8nU73OLMe+B6mbl8biEkjaG9c+lD2uun74XsiA4e+YvoOjPaN+K3yqjYQ2snXVC49NZ1HBjGGaXpntBVtGPVlk09g+mufU9uK3KMr8FYddwa+0DrmzIvOY9ktebFY7NIGBuolkkwmnwZRfHQFjFoSY4ghrWPonOjUR71GPkP8IX5R/6j0ul9HDg6/KkYxiQNGf+uM/aB1CwZvY+Zzn9O/7va9132hhcMvuEkbNPqs6Py+0rqmXC530nPuc9bH9J+69WGpVMredP8Ld+Zwq2H33hn8HUiMaV0eUdHlE0frGqk3yW/92PZgzHSrYffeGZiix27SGr6FLfTv6PsRErbf5qHFTeCW0U7+ZwDGPaNWtbrtt3louW3anKkzWvPYXo/VgyaPcKjgsHtEzf3KS2XJ9gjUdrkX+60uUNvw/2hYHzW6PyMLd98Xq2kwcBPz6kGTz5+YmJiYmPvPX9DomfTyUMriAAAAAElFTkSuQmCC>

[image7]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFkAAAAWCAYAAACrBTAWAAACOElEQVR4Xu2YPUhjQRDHBUUPhMMvCOZrkxgUI3gillqJjYdf2NkL9naWVhYWKljZWlmK2J219sKpWKl3WnhX3MEpYtT/mBmyjGvyUhzIe/uD4e38Z/bJ/vPebmJdncfjqUA6nZ7QmiaTyQxozRMAmNtnjLnn62MqlRrSPQQMPkN9RuuhJpvNfsGifyGeEYcwoUX3WDSg50GLBM2HsV00htGtyO8QRcQi8jFct/hv3Oi5oQaGLmDRG5JjvM1GDNp9yE9Yfw27JmjdzjHu5Ot9uSMiuExzaQL0P65aPB7v0LojXzJR2yYILPrKYUbNJhNaVzltM9HaJt6DnzYyeVzXiComPyDmaIw9eBQxb9fKnREG+/M0GYjruq4JlUwm+AOiff3W0pZxzym7L5LAiFUYsYNrkZ5CXReqmawpFAqN6P8pOca9iH+IA7svUiSTyQQ/jXu6RtRqMnofZZzP5z/L3Fgs1ozx93LnWxKJRDt91w4S+Brao+d/aNhkp5G1mIw3YwW9XyXHG3IBbVdy1M5l7ALGGRg4GTBG9PwPgyn9WNhS2qvJMGXY1rkWyGSY+Ql9V7bG9920etbseijBgmfFUKWLVm/rXAtkMnqKDk2b/O4BGypo4dgrmyTHK9rPZuzbfYIpHVoVTUZ91XV4Qjsy1l5vqmwXoQEHXRsW+8Rxq582AdpfxDXikuMH4neK/1ch8DbhNI8+TLo/jfngO9Y9ngDAuFOt2eRyuW5T+tHyTdc8Ho/H4/mfvABN1cCyr9BY7gAAAABJRU5ErkJggg==>

[image8]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGIAAAAWCAYAAAA7FknZAAACSElEQVR4Xu2YP2hTURTGUxD/UJCKQjD/7svzoRgdBDsVOhUnqcVFa8FJCwVHN8HFSaiDDk66FLq5lW6l3UqrIFgIiuIkIg5CoYKGkhC/Q+5Njsd7n28IhZDzg8O75zvnZfjOy715yeUURTkAKpXKtNQkURRdkprSJzCAC8aYhr02y+XyuOwhMIRPqF+X+lADQ3YQ24h7MPA2TLqFmEXcpBC9DxF7iF+IO7xm622Yf4bW+KwTyH8jWoj7yK/g+oJ6EN/lvUOPNSYUu6zvPWKN5XXEpsut1g7lWJ+210avQ+lCZuEpnqTtpFQqJbjGFNzEJEmOS5MJ0vCtGaN1oVA4JXs8+QOjW5IfGPPWo21hOBdZ/k6aavU24iXPZZ2lh4xuSdmBWROIV0Ijw0OD4NvPPmKO1vhWTSHmec2tlQxkMTxNt9oy4gfTHmELm+F9Sgowa4lC6j7D03ROrVY7jJ5vLsf6vOn86trgfQqDTMUgIp/uMzykc1BvujU/9PP5/CjWH3qd/1IsFk/Su0iWqFar5+T9AwlMuRsyNWR4SHdgpo9Rv+pynBlfoK24HLXPbu0D5hqYfC1jTMr7BxL7tus1FfpPX80OwvtU4/OOovaVa7b/Oet5yutKLv3pxpN8w1cjDbXLUidQa3k0OYhnvK7k0gdBUA3GLbB8MdQP/Qn9fJU6tNeorbrc/GdrGkrsILoHqwRv3cfsMN6Yzv9T9FfFiOyzW5LXYBzWR9zw7GFdlz1Kn4C5H6XGieP4rOm8+K3LmqIoiqIof/MHytPJQJ46pMYAAAAASUVORK5CYII=>