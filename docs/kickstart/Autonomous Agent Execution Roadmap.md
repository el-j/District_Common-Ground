# **Autonomous Agent Implementation Roadmap**

**Project:** District: Common Ground

**Execution Target:** Production Web Release

**Workflow:** Milestone-Based, Test-Driven Verification

## **Milestone 1: Engine Foundation & Top-Down Canvas (Sprint 1\)**

### **Agent Tasks**

* \[ \] Initialize TypeScript \+ Vite setup with strict compiler flags (noImplicitAny: true, strictNullChecks: true).  
* \[ \] Implement WorldScene.ts with a ![][image1] responsive viewport and integer scaling.  
* \[ \] Build InputManager.ts:  
  * Touch: Dynamic floating virtual thumbstick on left screen half.  
  * Desktop: WASD / Arrow keys.  
* \[ \] Build PlayerEntity.ts with 4-directional movement (Up, Down, Left, Right) and frame-based walking animations.  
* \[ \] Implement AABB tile collision checks preventing the player from passing through buildings or fences.

### **Automated Acceptance Criteria**

* **Test 1.1:** Canvas maintains a stable ![][image2] under mobile emulation (![][image3] screen).  
* **Test 1.2:** Moving player into an obstacle tile stops position advancement without clipping or stutter.  
* **Test 1.3:** Releasing touch input immediately brings avatar velocity to 0\.

## **Milestone 2: State Store, Archetype Selection & HUD (Sprint 2\)**

### **Agent Tasks**

* \[ \] Create useGameStore.ts using Zustand to manage resources, day counter, and coordinates.  
* \[ \] Implement IndexedDB persistence via idb-keyval saving state on every day transition.  
* \[ \] Build Character Select Screen supporting the 3 archetypes: *Precarious*, *Commuter*, *Landlord*.  
* \[ \] Implement the HTML/CSS floating HUD overlay using Tailwind CSS:  
  * Top Bar: Avatar token, Day counter, Commons Resilience progress bar.  
  * Resource Matrix: Cash ($), Energy (⚡), Trust (🤝), Stress (🔥).  
* \[ \] Implement SoundSynth.ts using the native Web Audio API to generate procedural footsteps, UI clicks, and chimes.

### **Automated Acceptance Criteria**

* **Test 2.1:** Selecting a character profile correctly initializes asymmetric stats in the Zustand store.  
* **Test 2.2:** Refreshing the browser tab fully restores player coordinates, current day, and resource values.  
* **Test 2.3:** Audio initialization operates without browser autoplay policy errors following the first user tap.

## **Milestone 3: NPC Interactions & Commons Construction (Sprint 3\)**

### **Agent Tasks**

* \[ \] Build NPCEntity.ts with proximity detection radius (![][image4]).  
* \[ \] Implement Context Action Button on bottom-right of mobile screen, dynamically changing state:  
  * Near NPC: Displays "Talk 💬".  
  * Near Construction Site: Displays "Build 🔨".  
* \[ \] Create DialogueOverlay.ts supporting typewriter text animation and response selection.  
* \[ \] Implement interactive building construction nodes:  
  * *Node A:* Community Kitchen & Fridge.  
  * *Node B:* Rooftop Solar Cooperative.  
  * *Node C:* Legal Defense Fund.  
* \[ \] Implement dynamic tilemap swapping: completing a project changes the visual tiles from rundown to upgraded versions.

### **Automated Acceptance Criteria**

* **Test 3.1:** Walking within range of an NPC activates the action button; pressing it opens the dialogue overlay.  
* **Test 3.2:** Contributing cash or energy updates building progress and triggers an immediate HUD refresh.  
* **Test 3.3:** Reaching ![][image5] building progress updates the tilemap and applies the daily upkeep reduction buff.

## **Milestone 4: Crisis Engine & Real-World News System (Sprint 4\)**

### **Agent Tasks**

* \[ \] Implement CrisisEngine.ts to manage event queues and resolution math.  
* \[ \] Create CrisisWireModal.ts displaying breaking scenarios and two branching resolutions: *Scapegoating* vs. *Solidarity*.  
* \[ \] Implement consequence branching:  
  * Scapegoating gives a short-term cash bonus but penalizes long-term resilience and trust.  
  * Solidarity requires energy upfront but provides lasting resilience and lowers stress.  
* \[ \] Create historical log interface reviewable from the central Town Hall building.  
* \[ \] Encode the initial 5 real-world allegory scenarios into crisis\_scenarios.json.

### **Automated Acceptance Criteria**

* **Test 4.1:** Triggering a crisis event halts player movement and displays the decision modal.  
* **Test 4.2:** Selecting "Scapegoating" decrements the resilience score; repeating this 3 times triggers an emergency visual state.  
* **Test 4.3:** Resolved events persist accurately in the history log with choices and outcomes intact.

## **Milestone 5: Pluggable Multi-Skin Architecture & IRL Quests (Sprint 5\)**

### **Agent Tasks**

* \[ \] Implement ThemeManager.ts according to the decoupling contract defined in system\_architecture.md.  
* \[ \] Implement Skin Pack 1: **"Solarpunk"** (16-bit nature palette, organic details).  
* \[ \] Implement Skin Pack 2: **"Retro Game Boy"** (4-shade monochrome palette, 8-bit pulse synth audio).  
* \[ \] Build runtime Theme Switcher in the settings menu allowing immediate skin swapping without reload.  
* \[ \] Implement the IRL Dual-Impact Quest system with daily reset logic and stat buff applications.

### **Automated Acceptance Criteria**

* **Test 5.1:** Switching skins swaps texture atlases and UI color schemes in ![][image6] without resetting player coordinates or story progress.  
* **Test 5.2:** Completing an IRL quest applies the configured stat buffs and locks the quest until the next simulated morning.

## **Milestone 6: PWA Packaging, Performance Tuning & Release (Sprint 6\)**

### **Agent Tasks**

* \[ \] Configure vite-plugin-pwa with service worker caching for complete offline functionality.  
* \[ \] Pack all sprite atlases into optimized WebP formats (total initial download ![][image7]).  
* \[ \] Add "Share to Signal / Messaging Apps" link generator with custom dynamic district status text.  
* \[ \] Run cross-browser testing on mobile Safari (iOS), mobile Chrome (Android), and desktop viewports.

### **Launch Acceptance Criteria**

1. **Lighthouse Audit:** ![][image8] Performance, ![][image9] Accessibility, ![][image9] Best Practices, ![][image9] PWA.  
2. **Cold Start Time:** Under ![][image10] on a standard 4G mobile connection.  
3. **Compatibility:** Touch controls, UI modals, and Web Audio synthesizers function without degradation across mobile and desktop devices.

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFcAAAAZCAYAAABEmrJwAAAD5klEQVR4Xu1XW4iNURSem0geJAfN7T9n5iCRy0y8UJQpIhJevMoDzyQJeVEeRiHzJClJwsMkl1xe8DKIciuDkmbMLZcMkxpz8X3nrD3WWf8+l5mHmQf/V6t/r29/a++11/n/vfcpKooQIUKECOOORCKxJAiCr7BhWEs8Hp9uNQT4u6L5Dttp+4nKyspkdXX1Y9Hdt/0TAeRxGvbK8kAZ1vRScu1G3jVWQHCtsE7YAPTHbX9WQLybkzsf7YsyWZ3Wkauvr5/ENmJ2iKZHa8CvJq/8pdqfCJSXl0+VXEPFBfcHj2Ll/4DtUhJyV2Edymd9vmlNVsjEGQWwHNq38as2G81NaqqqqjYrbhgF3WN0/bAWzY0nMPeQrCejuMjzOrgFmiN8tcCjzHKIX685LyBs9w2oObQH6KPA2x2H9kLRddOvra2dRZ9PpyHcVqI5H6DZZzkNbF2zLZcPGLMRP/5yyTOjuLKey5oDinWuyP2kL3cZ74Pl8wJBByV4g+Owj1bAv6B1mHiN6J7RR6JHfImAP+/jLaBbBd1ryxM1NTXz0PfZ8rmQTCYnI+Yt25KnfXPd+TFSJLSfww4rn19dKHeJC/E5gQm3MAjPU7bPAsW4Qy3ejEXiN/smBNfk433AGGsx9zvN4Y2dj/hOzRWCIL2fujaL4dtzU0USa8XcR339msvFZwXEjRj8Cp6DXKTtNyiVCZ46ArEPfRPyhyLPt9/2+YC5G6B/z7YUtstq8gExh/hlKZ+5hooLzRRXKLGMg8rxmsvF54VsAQy+Yfsc0Pc7kO1AcZd8E4I7I3zGoZALrsCBuY0UiBLEfdKErMfuuQnJqxhFjouG1qs0Ke5fVG6+IOQKBv+Gb7jls+254M75+FyAvg7WBfto+/IBMX0ejuuxxR3GNW2m5rCGB+SxX8dEkzrItUZ4jhfiQ4BoEHbWcKlgHjKGvwY7Zrg2PqFdyZix3hYcgnRhU3sstoUVwShPZegfeYzr6WObebJ42XIij5wPSPueTyfjDVk+AxBsE2HGAIordRyS2h83d1hej6Brcr7EbdUa+L+CAi/d0C0L1IWdYIHj5pAbLSSv0JurfQfyFRUVlWxj3jk+nYy31/IhUMhri/OxmMUSfMtxPOCECxkSWKd0vEEMOL9I7o3c0xTnBW8dgdkrHeSumrpWjQWSa7vhevlVaY5/iMD/1Bz8oWp1H4a/keNpTVbgAJvBAcS+SCIjbyMhnNfQXWK0L4L0J8gthFtLg+7PBmhPWE4Dec61XD5IHh2wtiD9Z6kH+Wxy/fwiZB2tfMJ/ouMd0Ncv2tQWE4vFpllNhAgRIkSIECFChAj/A/4C2/SGbc5vpD8AAAAASUVORK5CYII=>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEEAAAAZCAYAAABuKkPfAAACyElEQVR4Xu2XT4hNYRjGR5P816Tu3Lruvef+y42xu0msLJUiKWUjUpKSnYVCVhaThZqSkhQWtspKKcnGQiYTZciCZiwohgwWxvPOfT/e89zvO87Z6vvV25n3eZ/v/f7M6Zxzh4Yikcj/SqPR2JEkyTiuO52GfJ/1ZNLtdtdgwGvEAuIJ1wXoZxBziG+II1xntNc/A4s+pP4ZxA9T+4n4gPhstIs0jWx+RPscRiyv1+snJcf1AeIy+73IImRQr9dbKjkGnpOJrQf5c8Q9k08hHllPCLcB1oWkf6jXSPP6S6XSaq3NWl21vVZzeq5D6HQ6JTHLCTqNFwHPWt+idNwI6wz3s6D3MtSmrZblT/p3odQ3qjSc4Z3IdQi+CSuVykqbo/6UParL2KusM745qtVqx9Ztzed34NBfSg3XS5KjzzrJsdmj7JV/cJFDeKZ/b5NnQ8AzsKiQzvh8NsdCD3KN/Q5XS/7eCVY7br25kEY6+BZislwur8J1QjTyLU5itSydYV+tVtudNY79jna7Paq1N1bHIZ51Y0w8tJ4guKUO+CZE/gsxb/IBT5bOmIWlgn0O4/mo8clop9kvYC9bjedPoDTM3hQw7VLzDOn3tYHLXcMUIZ3x+Ti3+PxFwHNiPcZPa5/Um2SAZrOZqPGG1XGqd0THbbtF8tCiQjrj83Fu8flDyJvLPmQtiX5zsD6AmLDp26TdFb3Vam3Q/IuvmS72BetMkU0JRfx4HmxCXGddgH4qVx+d8BVpqVcimu33NRMNtR7rTJFNCUX8mH8s5IV+M1RLgVt+Mxslx91x3qMdM/k4j/Ohn+O5NyU4P27zFVxj3CEgprim+nbWvaDRCR2w+NsB+QX2yIKkhoN4jOsk4jvkJeyzJP1vfvk98FZjFjHHPgdq84j3iHfql7Gpz3dGDgFrugKfPOAWNL7KFfoe9kcikUgkEonk5TefB1Z3BtM3PQAAAABJRU5ErkJggg==>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFcAAAAZCAYAAABEmrJwAAAD/0lEQVR4Xu1XTUgVURRWMwqKssheme+NvrH/qPRVi3DXH0VkIJSQK4MQCqQfCVtE0aaF9ktSRBRWi9pI0S9GEQRJ0SII+gUTtUyqRYsWltZ3nudOx+O8mYeLt+l+cJg53/nOuefeuTPvvqwsCwsLC4uMo7i4eInjON9gf2DtRUVFeVrDsSOwGtg2aKpgW8lc142SBvc3EGuORqMu3GyqG4vF7oFfqsplBOhlJewH9Y4+jus4IwfxFzy/Lvi5Msh8E2y7njdqJqR2BCCqRdIp4+P+ChcsM1w8Ho8x52sU59wnOga7aupkEhj3KeyL8F9jrg1KU0Y9YhNE2K8kX2n0fDxDvQqpHQEjDOJwvxN2DFaKhZxDOxNPLQ7bjwHOCd0j+LtxvQzba/hMwxl6w7z+CwoKpvGc7ghZNnGYyzJD6Hljfgvht9EOxQOYa+aN+7XgXxpdSkDULQsypwe5L+OMXGh+SgL+A1yyJZcukLtPcxJmd6UD7v+C5PDQ50kf8Y963kBOIpEYaxza6dhMk6WA4JOXHpB4gJvboGMSiP/24dqyRrm4eIDlyH+leQK9LYj1aN4PWJB13H8l+dhtm7SGwJrkImHsBciboTV+QE53SUnJJM2HAgNspgFxPaljEtA0Q3NY87TDYXWI9+N6iWvVal0qIGcV9O8kR68j6nyWXBCQf43GRa1q3B/CdQr8Ll2DF7cT1ldYWDgV113ERSKRCVIngVpbYI81HwoUbkQz13EdoEnquAQ1oTkC8m/ShIQ/nie6WsgCQVrkvKd7XtherQkC9G954b4rnrjTfD+Tff057NCcBMdyNJ828BRn8cC3dIwAvjGoAQ2/SYTBLDCsT8fCgJznNB5q7FC81wftTr++kHOQOHqokufYRq0fFfwGNiAeO/KZ5gnyx8AgqFYqOENHpF5Yh46FAYtwkcbjs7YH3Qf7dK6Vmj3M10ueY8QPaj4QSBiAnVdcshE0Wi55E8PiHtW8OAvflrypJbkgOEMLm/w+YgetwP0HrQkC9Ot5zPmKH9YH+945mLl64vWu5xjp2zWfEg4fmuWgzBtujOSxqBU8eJ3kCeDiHBv2feVaI04WfoCuFPZJcrTA+kcuDNxHteYcsfNoHD1vjHOCuWEnHvB5nN8q+VBQEo4W44yPySzmQvLAnQQaPsuxGh0jcGPeBx9NNRBHP2xC5gu8xoug7dQ8AbHliL3RfCpA2wIbMH5+fv5E7sM7bpnvLp0UDMdze2h8A+RVcaxFxwLBx5BBtq9c5IzWEZx/O937a6xA/9P7Yb9Y94cmpkV+gLZJcxLoc7bmgoB6rdxDcofSw9MabJY1rOnh612tIbiuO53ifm+shYWFhYWFhYWFxf+Evw7CbCbJFmaVAAAAAElFTkSuQmCC>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEEAAAAZCAYAAABuKkPfAAAC3UlEQVR4Xu2Xz29MURTHRyt+JH4lMizmx5tfDJOQYMEEixI2XVrYiNhg0xCLrlhY+AuEEIIQK00JCyu7SoRUxMaPDZpqEAlaKZEqPsecN7lz5s3PkDbt+ybf3Hu/55z7zj3vvvvei0RChAgRYgrged4Y3GP1dDqdR/8Kf8PHSJ3WZ0YglUod1kVWFCGTySTRHvjjfD6/WPzQl7p+0w4k2W21RiDmY1ARRHPHqvXAl1afFiCxC3CCu7rG2uqBmC/aBhYBbnC1ZDJ5FO2Nq005SOgeHM1msyusrRFY0H6KdkD6dYogPONquVxuifQTiUTWK+2M08y1D6mD9gjj6/IolScqxe2ARa63GZ9totFuRdvIubMefYvr3wzmEvwMDsXj8YXW2CyIH3P6stiKIpDcStV9TnK9Vb5dEkfrU9s44xsUaD4+61R76vvS74XPVX+h8Sf9eSnIFd+3LuQOEPABDjLssPZWIPPQzHHGkkzV2wGtqLa/JPHbAT5i6zNal+i6Q1x9VHTpY9tJ/5ZrrwkqG/NKlb5jbe2Aubpl2xpNFmIfhxNwSPrOG0R42fhJca66mq8La+j34bi11YQcdgT8JPHz1tYOmOt7gCaJuUXorLGAb1ZvtQiso6C2LmtrCGdHVG3JVsAcA4aDmpQ8swPqcxYO21iBXZiMWyzCQ6+0E6psTSMajS5ighEu/CjiPNftgpN8tSZc3gnMfaxWklYPKgLjZapX3DDGe9EvSZ/2F/zh2tuBbNkn8DWTL7DGZqGvKjnEDrm6aLwhdhvtLn7njCYFlMKUP6kZTwYUS86YslYoFOZp7E3Xr21IxZnsUywWW25t9UDMZzgCh+FbGfs2Kay/GPhK2+NuvEB02Qm0/eoj7Dc+8lUq13gPL6o2Ad85eutnRBC4Swet9r/hF8Hqswp6569ZfVaAXbeJxZ/SIshHUI/1mfFg0Wv5f9ieKn0+FynKLusTIkSIEP8afwDbVf2OPaOOIAAAAABJRU5ErkJggg==>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAZCAYAAAB3oa15AAAClElEQVR4Xu2W24vNURTHz9Q8uOQScnRuv3OrE0rDJMkDRXkV5R/w4hJRlBeexhNNKZ6YlDIeqPEml1JT5JIizOR5FCJqGDFhfNac/Tsta/b+ORNF+X1rtff3u75777V+t3MymRT/MUql0rJ8Pl+wuka5XF5itX8CURS9JXqIXuKZzQvQK8SE1RPBgoN0vcvqMcgfIUaJT8QOmxcUCoU6V/eeHE7ctHm0bcQ3xd8Q45w7SGwmtsDfy3ru0EK91guMF2UDd6DEbusRoA8RNxR/StzWHg5fL3so3qW5AP6KeKD4oUajMUfmuVxuFkMnF2A5en9rUbsINVCv1+faQgSiUeR8w3+6g1Hz4tzVHuJWzPFvoOCNMY89mreNUANoj3ybOv9ZmddqtcXCZdQeCryu1zK/GqnnnvkxPDMUf9jWo+NDQgOihxqY1LmKR30e9HNap9g1mpucPHIXYj5t/GYDVwKe01an0JNR80UdrVQqK5R3yvppwRW0J6BP2VzrFDXo87hiJ/g65W1OA88TPAti7u6cvD8rtS8RchAL9/p0X3FaZ+wPeE45vdPmYhSLxdV4zsec+UsaP+zmIwwdLXMSXAP7fHqguJYeegfQ+ny6hsl3WD98QPMgZCGd7/foH+ymTpcGhmVOA+uE/+orZCHrq9XqPMXXWj98TPMgXAMHrE5x2+2mAtHIdWtObDWej8Q7rcVwxZ4x2lJ7VlsN8Cu4yBVwwuYErrmdih+3B9HMNbSvSpp8HFhXVloL5L5bTWD3jZIeIZKXoub/kRfEiBtfE+PaxxdipivmPuNj4nPG83K53BhxWfw0tcl6BOSeZ7PZ2VYXkLsTuc+51JTxnPPXQWE9VtMgP0B8IVbZXIoUKVKk+CP4ATmi8RO1PT43AAAAAElFTkSuQmCC>

[image6]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE4AAAAZCAYAAACfIRhSAAADbUlEQVR4Xu1WX2jNYRg+YwrJBUbt7Jzf+ZfGFNqNUBTlQlzIjXCjFDfcuSOMuDBRhvyJJCJqSMKkXPmbKG4oMZOt2I7McNbmec7ez969O9vZzpaWvqfeft/zvO/3nu99z/d9v18o5OHh4eFREGKx2J0gCDphzbAN1k+UlZWlotHoI4mrs34H+Kphv2FfEL/Q+v8bsBGVlZVjOEYD10hjmnQM9EXUFZ+juQO0NGyP4m2I3a9jRjyw6OVWs0DMLeyKWqPdZFMikchKpXWiAZtNHHfVQ8eRZ4ltJnbpJKuNWGChJ2AZFFpufRaIa2dhKHq10zCuoAZrJE8mk1PJ+eye2X28HZdG9mqS5F9n9REDLLAOlrYF9gfsiDDmnNMaGrJYGveMHEXvyNUQ6GdM4zgno2OcjpwvZbwW4114XiTHWiMYVyPXehdfWlo6BdpB6qDFTndA7Fb43sKu8sqAHbIxA0ExEryGvUcTxllnIcDCbrNYHNVZwmt1gxyg1WidY9g3HaP0NhlvF067i9wJ0ZtgGfB9aMQm0fiSYf4ilavZrYvgywrxlxzPi1QqNRFJGmFPQUdZ/xAwWop64gQs7IEU0APQD1PnriWXeV9tnOi6wefJUfRMpc2VuB67X+K2aI4dOV7HDKhxcrRaEXzd+oYDyN0WyBFV2gVduNKPiJ49TlJ4iwlzeofjaMRZmw98BjV7zVBDrTs1F7sfDODl9xdIUo4J7fjx49Y3VCDvK+S/bPW+7jhop7UuBf3SMUp/o/gpm4/fiNTsbpK5ux3nZxN4h+hZSyQS0/WcfqF23jXrKwTIdQW212j1fKJxC7hAuxtivd+q2UJ0jNOR45jiJ20c7q0ktXyN4xXlxvF4fHZfv5kXJSUlEzCxAUU8DqlLdDBAUdti5hsNi5qGvDWOywJX6Rjw74G60zA+mqOIImruA5vIdVTz7LgqzbXffSppbbDgpf4c9g5NGGudfSEqH625DHmWqTi+advV1GxDEBNTmttdFY7zDw3Mmxb8BuOMNl9+N250u1vJVziO/POCHC+kgsDjy2ThcHiy9VnIYnNayLytob2AtQZdx5oFLNV+Ajs1kPn34P+AZ4P2g7fAPsLqYZ9hVbCfsE+i8fkj6DrO9FNjfJrzJeeBQNYoJ214gR/ZaDUPDw8PDw8PD49/jj+WtE0SJ4bB1QAAAABJRU5ErkJggg==>

[image7]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFcAAAAZCAYAAABEmrJwAAADS0lEQVR4Xu2YTWhTQRDHYyuiIF4kiqTJJiagBDzYk6IglIIHRc8e/NaTF9GziN7EiyCIX1ctfhys4EFQLOpBtKJ4EBFRipZ+aWuqFmmr9T99szpMd1/zkiAi+4Mhb+c/M2933r4PkkoFAoFA4H9irjFmXDt9IHY17A6sFcOmXC63PJ/Pn8LvDR1raWlpKSF+BDZlTcdIoB8SsZOwIfZ/lDVgX2GfYBXhO6zr/XUwiVdyolr3gSa2yzy2QR3nAnFtsNOUk81mt2jdImtrjWDts8N/krUOrTUEFN6kfXEgftS3CBfYpRsQfwt2EXY8nU4v1DE+EN+Gi7OdG+C8W1B/PuwgxzjnxdqA9hNxeTWDgudhE5jYSq3FYRI2F81Zj3Mc0/5qMNxc5F/1nRP6bfqNaxJrfdpPxOUlxkTPv0qxWFyitWqoobnr6m0uDpu5CWccMdM7Mq5JrM1oLmpvZu2e1pJAL6GXsB68LBZoMQkmYXMRuxZ2iRfRARtDs+/rOBfmT3OdzaMLh/Ws8ukW1obw3C7SyxJ5ZYyvs/+Ijq+KUqm0CMkDsG4Mm7ReCyZ5c1thPcpHi3ogfS5M1NwdfLyP8nDHZYU+Ko6ppnNerA1TPTJc3I2wbTj+CXuk42PB1ckg6RsK3NRavdCCfIuoFuT3V1ODG7FLjKlJb+wY2hWlOWuyNuOxQMTlOaGXFBImcdXPaq1eTGOa20U1CoXCUq1JTLTT9ojxW3turO0ofpqF5m0Sa77mXmb9gtZiETu4U2u1YhI217VojLvJR59R0q8xUXP32jHi85y321FzxnksrPVrP4FaJ7jmC61VBX1bokAvCjzGcI7Wk2BimkvNgnZA+nhh15Rv3FdDYqJn7n7lo3r0rPzddOF31mTN9537g3TMfY3WkkKfNM9g72bbNT6QOzbLIqbobSx8z+mtLsbLeDE7rc8HYl4jdiQlbn/4zrnOb8+t/eVyeR5rFa3B95S1h1qrC0yyE0WHM5nMYq25QOwXWB/sPVsv5dPnjY1Bza3wPZF5hIk+A2kR0zsWzW7XMRI8i1cgbhD2gc9Fx21Wx3GXOKaa9IK086I5fmeNzimNdvyEiTYI/XdxV86/4ejbLhAIBAKBQCAQ+Af5BRzdUlZO1FqfAAAAAElFTkSuQmCC>

[image8]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACoAAAAZCAYAAABHLbxYAAAB70lEQVR4Xu2WzytEURTHZ0iNYudZjJn3c/SyEJkFpdiwUpbKfyAlSYmN2FiwFGsSa5QiSsnS2tZKsfGjZmOo8T3mvpnTaZq5Mw01eZ86vc7P+7133o+JREJC/jGmaS5ZlpWF5WzbHpV5xE6Q200mkx7cqOM4feg5R7xf1v6A5DgNg83KXK1gVgZ2x/wX2KaouVXrcjvkNSWB4GFVvCVz1YD+HZrDY6lUypAx+Nc4vQVcD2CLPKdFIpHoRuMH7EjmdAhOp1QcwpaZf4VLlJXURjwe78CwVwy/kblylBMKe2L+ZaQeQgMgNIahD7B7uM0yL6kgtBDHrXYBm0csi+se5bDWDO+pGs/zOjHojZ5KmZNgsXUpFH1TUijqTmFrzKcDyaF2LIhpg1eGTzvGkH2ZKwd6MvyWgf+shGZ5nURupiIQOKJ2tyFzuqB3FTPeYdvk0zwuPp1OtxSr82gLxaBpVVy3dyqBN0krzaVfiHzXdU21zhmvqygUu5+jAnwlJmWuWiDGUqc3GMQw/5gLgO+SL+9HJfSLxwrQDY3kgIzXSvDhwCn2ku/7frsS4PA6Jbwp8KFjRW0wxsp+F6v48DyqxW1ZA5qs/H+BT1WbMwyjTRY1HviJurCbCR3DwQzJ/j+DPpV04+sYxPbI/pCQkAbiGwAoo5laZ4gHAAAAAElFTkSuQmCC>

[image9]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB8AAAAZCAYAAADJ9/UkAAABgElEQVR4Xu2Tu0oDQRSGE7CxEQuxiCG7kH0AwdLCxiew8AVsvKAYsNUX0EbQTrHTQgtbL5UgqJWC6ANoI4KFNyQI+h0c9ezMmTQpsz/8zM53/j1ndrMplQp1vJIkWUjTdMrnv6K+iJ/xO57w66JqtZrVarVz6l/42K/nRGAHN11YPO1nRPAbfKT21/hUZzj4iPRQ+0G9b6nY8CzLeqwmwhjQ6+1zby75ebAzzUzFhsMuY8PxhlzX6/V+2cuqMxzm0Lo3UIvhwoMGmvM7L1kZ+JbFA7U5fD+SWbd4INdsJsKDBprzek+sDHxVOP+CAb+Wk4R4glmLW401Z92OZNYc7/JrObnhcxaPNP7jsd8ctmnxQBLiNc0b/MVq4IbfyjXDh2Xf1tdOuOFzGo9bDYRRG9J7POZlXvGTZoEqlUqfu3nFr4ncwSbVftk/EAc5gH0qVHb3pYr9i+IufsT3+M6tD7ipc3yt3a7RBesV/gCXdUbkam94T/IcaNTPFCpUqDP0DYneohcDV4gwAAAAAElFTkSuQmCC>

[image10]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAZCAYAAABU+vysAAABlElEQVR4Xu2Uu0rEYBCF1wtYaaGCks2dQHpB1N43EDtbEV0UhS20UsTCwspWGyuLIGjrC9gJC/sAghauNtqu1zM4wcmYXfPDlvngkPznPzOZXHYrlZISQzzPq/u+v6r9biB/iLo36B3nZ3q/MGhwDrWhL9aaznQC2Vdois6r1epY2kPnjDEZBHc/g2wrjuPh1HMcZ5p73MqsMYaD0CuhfFP6PXkqJoMQyCZRFI0oTw/Sj/UpdA8dQHWxl4/pIBrUznGPhK0BNZRe58NNatovCtd/inVNXxiv9Equc6Ei13XXtV8E1F5AH9KzbXuUhyMdh2Hoyv2O8CAb2v8P3OUKal+0T6DfkhiGlJvLQEE03dR+N5CfRd2d9KgPHfEhDyl/n6+xJ/0/cGhL+wTubDEIggnpITuJmob0iHQQ1Owis632GvCupZfBsqxxfnRHeg/08Z788AZTL0c3FKA7VzU0yCMGnJdeupFAz9CD9/Nbp2MLasscii898R+A8xNx4YwwwA5leJAF6CndQ5/l364lJSUlveEbksuPZVfNF0oAAAAASUVORK5CYII=>