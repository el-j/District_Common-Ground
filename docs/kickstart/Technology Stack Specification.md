# **Technical Stack & Dependency Specification**

**Project:** District: Common Ground

**Target Environments:** Mobile Safari (iOS), Mobile Chrome (Android), Desktop Web

**Performance Budget:** Initial load ![][image1], Boot time ![][image2] on 4G, Stable ![][image3]

## **1\. Chosen Technology Stack**

| Layer | Technology | Version | Rationale |
| :---- | :---- | :---- | :---- |
| **Language** | TypeScript | 5.4+ | Enforces strict schemas for crisis data, inventory tokens, and coordinates. |
| **Bundler / Runtime** | Vite | 5.x / 6.x | Instant dev HMR, aggressive tree-shaking, minimal boilerplate overhead. |
| **2D Tilemap Engine** | Phaser 3 (or PixiJS v8) | Latest | Built-in tilemap rendering, pixel-perfect camera tracking, and AABB collision boxes. |
| **UI Presentation** | Tailwind CSS \+ Native DOM | Latest | Crisp text rendering at any resolution; keeps dialogue trees accessible for screen readers. |
| **State Management** | Zustand | 4.x | Lightweight (![][image4]), outside-React accessibility, zero-boilerplate mutations. |
| **Persistence** | idb-keyval (IndexedDB) | 6.x | Asynchronous storage preventing frame drops; handles cold restarts without data loss. |
| **Audio Engine** | Web Audio API (Native) | Standard | Procedurally synthesizes sound effects (chimes, clicks, chiptunes); zero external MP3 downloads. |
| **PWA / Service Worker** | vite-plugin-pwa | Latest | Enables offline installations to phone home screens with zero App Store friction. |

## **2\. Directory Layout**

district-common-ground/  
├── public/  
│   ├── manifest.webmanifest  
│   └── assets/  
│       ├── skins/  
│       │   ├── solarpunk/       \# 16-bit tilesets, nature textures  
│       │   └── retro\_gb/        \# 2-bit Game Boy monochromatic sheets  
│       └── data/  
│           └── crisis\_scenarios.json  
├── src/  
│   ├── core/  
│   │   ├── state/  
│   │   │   ├── useGameStore.ts  \# Zustand simulation store  
│   │   │   └── actions.ts       \# Dispatched economic and civic mutations  
│   │   ├── simulation/  
│   │   │   ├── EconomyMath.ts   \# Upkeep, energy regen, commons calculations  
│   │   │   └── CrisisEngine.ts  \# Choice tree evaluator  
│   │   └── audio/  
│   │       └── SoundSynth.ts    \# Procedural Web Audio oscillator engine  
│   ├── world/  
│   │   ├── WorldScene.ts        \# Top-down tilemap & viewport manager  
│   │   ├── InputManager.ts      \# Floating virtual joystick & WASD handlers  
│   │   ├── CollisionSystem.ts   \# Bounding box obstacle checks  
│   │   └── entities/  
│   │       ├── PlayerEntity.ts  \# 4-directional sprite controller  
│   │       └── NPCEntity.ts     \# Proximity triggers & exclamation bubbles  
│   ├── ui/  
│   │   ├── TopHUD.ts            \# Day counter, Resilience bar, resource counters  
│   │   ├── DialogueOverlay.ts   \# Typewriter dialogue & branching choices  
│   │   └── CrisisWireModal.ts   \# News alert cards  
│   ├── skins/  
│   │   ├── ThemeManager.ts      \# Runtime atlas and palette swapper  
│   │   └── SkinInterface.ts     \# Typing contract for skin packs  
│   └── main.ts                  \# Engine bootstrap  
├── index.html  
├── package.json  
├── tsconfig.json  
└── vite.config.ts

## **3\. Hardware & Network Performance Budget**

* **Virtual Resolution:** ![][image5] pixels internal buffer, integer-scaled to fit modern phone screens (![][image6], ![][image7]).  
* **Memory Ceiling:** ![][image8] runtime heap allocation on mobile browsers.  
* **Network Payload:** Total first-paint bundle including initial skin: ![][image9] uncompressed (![][image10] gzipped).  
* **Storage Footprint:** ![][image11] for 50 in-game days of saved event history.

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFcAAAAZCAYAAABEmrJwAAADS0lEQVR4Xu2YTWhTQRDHYyuiIF4kiqTJJiagBDzYk6IglIIHRc8e/NaTF9GziN7EiyCIX1ctfhys4EFQLOpBtKJ4EBFRipZ+aWuqFmmr9T99szpMd1/zkiAi+4Mhb+c/M2933r4PkkoFAoFA4H9irjFmXDt9IHY17A6sFcOmXC63PJ/Pn8LvDR1raWlpKSF+BDZlTcdIoB8SsZOwIfZ/lDVgX2GfYBXhO6zr/XUwiVdyolr3gSa2yzy2QR3nAnFtsNOUk81mt2jdImtrjWDts8N/krUOrTUEFN6kfXEgftS3CBfYpRsQfwt2EXY8nU4v1DE+EN+Gi7OdG+C8W1B/PuwgxzjnxdqA9hNxeTWDgudhE5jYSq3FYRI2F81Zj3Mc0/5qMNxc5F/1nRP6bfqNaxJrfdpPxOUlxkTPv0qxWFyitWqoobnr6m0uDpu5CWccMdM7Mq5JrM1oLmpvZu2e1pJAL6GXsB68LBZoMQkmYXMRuxZ2iRfRARtDs+/rOBfmT3OdzaMLh/Ws8ukW1obw3C7SyxJ5ZYyvs/+Ijq+KUqm0CMkDsG4Mm7ReCyZ5c1thPcpHi3ogfS5M1NwdfLyP8nDHZYU+Ko6ppnNerA1TPTJc3I2wbTj+CXuk42PB1ckg6RsK3NRavdCCfIuoFuT3V1ODG7FLjKlJb+wY2hWlOWuyNuOxQMTlOaGXFBImcdXPaq1eTGOa20U1CoXCUq1JTLTT9ojxW3turO0ofpqF5m0Sa77mXmb9gtZiETu4U2u1YhI217VojLvJR59R0q8xUXP32jHi85y321FzxnksrPVrP4FaJ7jmC61VBX1bokAvCjzGcI7Wk2BimkvNgnZA+nhh15Rv3FdDYqJn7n7lo3r0rPzddOF31mTN9537g3TMfY3WkkKfNM9g72bbNT6QOzbLIqbobSx8z+mtLsbLeDE7rc8HYl4jdiQlbn/4zrnOb8+t/eVyeR5rFa3B95S1h1qrC0yyE0WHM5nMYq25QOwXWB/sPVsv5dPnjY1Bza3wPZF5hIk+A2kR0zsWzW7XMRI8i1cgbhD2gc9Fx21Wx3GXOKaa9IK086I5fmeNzimNdvyEiTYI/XdxV86/4ejbLhAIBAKBQCAQ+Af5BRzdUlZO1FqfAAAAAElFTkSuQmCC>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADgAAAAZCAYAAABkdu2NAAAB8UlEQVR4Xu2UzUrDUBCFW+1CUUSQ2EXaJG0K/jyAS19ApAsRdK2C4mv4Cor4FrrVvaJCQVHc1b8iIggqSq1CPVMTGadJbBJFlPvBIblnZm7u5OYmkVAoFP+dlGmaNWkGkc/nDdScQnXosFAo9MicXwcLO3EW2JCM+4HcCWibjctUb1lWkef9GHjYmPSCQP59yAbrhmFMSi/MHJHAA9agF7zJQRkLIkqDMh/jG8cf4v63gEm3oDvbtvtlrBXCNogXuABNcQ/1zzQHP4vImYYO4G/mcrlR3O/ymq+gH8MxdJbJZDplMAxhG/TC2b2POXC/A82y8Qp07Y59oTdEidA+hm0yHoW4DaJ2meqxSwPM+zR2PP8GsUs6Eh6xzRsyFpc4Deq63uc0M8J9Wiv5UIk+VR7zhH4cSH7F32tVxuISo8Ek1eHsZ2WAQOzBabIhrH1c5jTBdnJdxqIStUGqSafTXWw8k81mbbrHUdJcH2u1EKuFeoamad0oqDh/pqSMhyGoQczfgdii9OFVcUkJ74jdN83n5bVCOwpLUJkWI4OtgNonv4eTT8LnNex6uD93fSlRt+SOsbZeHo8EfbaY5JYOvox5Yb6fkSvowlGF6t3PjMCcRXh7oq7RjJdYThW18yx2mRA7Hhm84TnpKRQKhULxR3kDvxOv+ODKJd0AAAAASUVORK5CYII=>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEEAAAAZCAYAAABuKkPfAAACyElEQVR4Xu2XT4hNYRjGR5P816Tu3Lruvef+y42xu0msLJUiKWUjUpKSnYVCVhaThZqSkhQWtspKKcnGQiYTZciCZiwohgwWxvPOfT/e89zvO87Z6vvV25n3eZ/v/f7M6Zxzh4Yikcj/SqPR2JEkyTiuO52GfJ/1ZNLtdtdgwGvEAuIJ1wXoZxBziG+II1xntNc/A4s+pP4ZxA9T+4n4gPhstIs0jWx+RPscRiyv1+snJcf1AeIy+73IImRQr9dbKjkGnpOJrQf5c8Q9k08hHllPCLcB1oWkf6jXSPP6S6XSaq3NWl21vVZzeq5D6HQ6JTHLCTqNFwHPWt+idNwI6wz3s6D3MtSmrZblT/p3odQ3qjSc4Z3IdQi+CSuVykqbo/6UParL2KusM745qtVqx9Ztzed34NBfSg3XS5KjzzrJsdmj7JV/cJFDeKZ/b5NnQ8AzsKiQzvh8NsdCD3KN/Q5XS/7eCVY7br25kEY6+BZislwur8J1QjTyLU5itSydYV+tVtudNY79jna7Paq1N1bHIZ51Y0w8tJ4guKUO+CZE/gsxb/IBT5bOmIWlgn0O4/mo8clop9kvYC9bjedPoDTM3hQw7VLzDOn3tYHLXcMUIZ3x+Ti3+PxFwHNiPcZPa5/Um2SAZrOZqPGG1XGqd0THbbtF8tCiQjrj83Fu8flDyJvLPmQtiX5zsD6AmLDp26TdFb3Vam3Q/IuvmS72BetMkU0JRfx4HmxCXGddgH4qVx+d8BVpqVcimu33NRMNtR7rTJFNCUX8mH8s5IV+M1RLgVt+Mxslx91x3qMdM/k4j/Ohn+O5NyU4P27zFVxj3CEgprim+nbWvaDRCR2w+NsB+QX2yIKkhoN4jOsk4jvkJeyzJP1vfvk98FZjFjHHPgdq84j3iHfql7Gpz3dGDgFrugKfPOAWNL7KFfoe9kcikUgkEonk5TefB1Z3BtM3PQAAAABJRU5ErkJggg==>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAAWCAYAAACcy/8iAAAAs0lEQVR4Xu3UOwoCMRgE4PVRKCw2EpuEJJAU3sVzeCfxFlp7AhHsbMXCwmbBwkoLZzuZA1gM/wd/kUw15NE0xhhjhKSUVrwnCUW3mHfOecmZFJQ8YJ6llAVnSsYoecHcQghTDmXUWmco+cCcsBxyLgOn6FHyhfe550xS/xGh8CfGuOFM2s9J7ziT5pxrUfyO4kcsB5wrG6H4GXNF+QmH0vprjuKd937OmTR8bGveM8aYf/kCLSYdpVFR0swAAAAASUVORK5CYII=>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFcAAAAZCAYAAABEmrJwAAAD5klEQVR4Xu1XW4iNURSem0geJAfN7T9n5iCRy0y8UJQpIhJevMoDzyQJeVEeRiHzJClJwsMkl1xe8DKIciuDkmbMLZcMkxpz8X3nrD3WWf8+l5mHmQf/V6t/r29/a++11/n/vfcpKooQIUKECOOORCKxJAiCr7BhWEs8Hp9uNQT4u6L5Dttp+4nKyspkdXX1Y9Hdt/0TAeRxGvbK8kAZ1vRScu1G3jVWQHCtsE7YAPTHbX9WQLybkzsf7YsyWZ3Wkauvr5/ENmJ2iKZHa8CvJq/8pdqfCJSXl0+VXEPFBfcHj2Ll/4DtUhJyV2Edymd9vmlNVsjEGQWwHNq38as2G81NaqqqqjYrbhgF3WN0/bAWzY0nMPeQrCejuMjzOrgFmiN8tcCjzHKIX685LyBs9w2oObQH6KPA2x2H9kLRddOvra2dRZ9PpyHcVqI5H6DZZzkNbF2zLZcPGLMRP/5yyTOjuLKey5oDinWuyP2kL3cZ74Pl8wJBByV4g+Owj1bAv6B1mHiN6J7RR6JHfImAP+/jLaBbBd1ryxM1NTXz0PfZ8rmQTCYnI+Yt25KnfXPd+TFSJLSfww4rn19dKHeJC/E5gQm3MAjPU7bPAsW4Qy3ejEXiN/smBNfk433AGGsx9zvN4Y2dj/hOzRWCIL2fujaL4dtzU0USa8XcR339msvFZwXEjRj8Cp6DXKTtNyiVCZ46ArEPfRPyhyLPt9/2+YC5G6B/z7YUtstq8gExh/hlKZ+5hooLzRRXKLGMg8rxmsvF54VsAQy+Yfsc0Pc7kO1AcZd8E4I7I3zGoZALrsCBuY0UiBLEfdKErMfuuQnJqxhFjouG1qs0Ke5fVG6+IOQKBv+Gb7jls+254M75+FyAvg7WBfto+/IBMX0ejuuxxR3GNW2m5rCGB+SxX8dEkzrItUZ4jhfiQ4BoEHbWcKlgHjKGvwY7Zrg2PqFdyZix3hYcgnRhU3sstoUVwShPZegfeYzr6WObebJ42XIij5wPSPueTyfjDVk+AxBsE2HGAIordRyS2h83d1hej6Brcr7EbdUa+L+CAi/d0C0L1IWdYIHj5pAbLSSv0JurfQfyFRUVlWxj3jk+nYy31/IhUMhri/OxmMUSfMtxPOCECxkSWKd0vEEMOL9I7o3c0xTnBW8dgdkrHeSumrpWjQWSa7vhevlVaY5/iMD/1Bz8oWp1H4a/keNpTVbgAJvBAcS+SCIjbyMhnNfQXWK0L4L0J8gthFtLg+7PBmhPWE4Dec61XD5IHh2wtiD9Z6kH+Wxy/fwiZB2tfMJ/ouMd0Ncv2tQWE4vFpllNhAgRIkSIECFChAj/A/4C2/SGbc5vpD8AAAAASUVORK5CYII=>

[image6]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAZCAYAAACB6CjhAAACkklEQVR4Xu2WPWhUQRSFF7VQ0EJw/VmWfbvuwoJgYRoRBUHsxULFRhsR4h8KomIhaCkWgthZKhZpbAQLC1G7pLDRSiOihqjgb1AIiJ6T3Ak3581LXjZr5Xxwedxzz8zcmVnevkolkUgkHFmWnW02m4OqBxqNxjl4JhF/4Nup9RjwbkE8RAwgXYI5NmLsdTzvqbcfYO4DWOs7e8Qah7SeA8a7YVMWx9RDoE8gRlz+GXHVe2Kgid1u7hAf1dcPMO8LxA+XDyOees+cWHO5A4B2kzWvdTqdqmox+EuB7z7iFuJKtVpdqZ5+gIPex37wXO11au12e63XCpnjAKjnNksNG7ygugcN7YDnsur9Br08L+oRPTxQPUovB4AYV92Dxbcv5gCy6XfHvMzTY06P0uMB5HQP6tsQd8zL981PHMhj9cWA9xXHwX9Qawp8r2O9lOlxBjMfV503qJPgZveXmRz1AcQb0Tjuiddi2Bud8y/VmgLfLnprtdqaoGH8+jI9zkAjNnZSdYLahL855B9s8knvKwPGjJduagFgzpeIry7/1csBnFI9gNoleL4hbjCnv+zP2YNxjzi21Wqt09piwbwnEGOI25bzAH6rL4pt6LTqMer1+grbRFdrHmtg1g0gH7G1lnv9X8B1cHFHVY9iTZ1RHZvMrLY1aPyS041xQ5m8Q+wAhkSb+vDyWhHwXVStCNvs+ZDzMsuuU+HLw5q9pjX+lbGGW9/MvNvtrjJvy/tMYxObnPaM412+gR40dzhoRcD3xebM/TNFWGbeI0GwfK835YBhCPEJ8Q7x1p58wc16uZnGCd/ziQ00fZ1A2oPasOrZ9Ccqx07dPD+P1RODBw7/qOpFcG1bZ3Qh6yQSiUQikfj/+AvH2O9+2qjlgwAAAABJRU5ErkJggg==>

[image7]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAZCAYAAAB3oa15AAAB6klEQVR4Xu2VP0sDQRDFYwpFRdFCAjHkLhIIBqwsLBT8ClaWNjaWViKIgthpGbSy8wvY2wmCiIWKqJWdYEAENagENL459uLkZRdCknJ/MOTmzbvZ2cv9SSQ8Hk9ENpudC4LgBVFDnENKskdAbRPxjvhELHO9W2CeNfSvyjxhGM5zvQGYSogDlctwNTSZIN8d4kTlt4gz7ekG6FlBXKr8FbGrPQ2YXc6wJhHn+Xx+WOcx5twR1tsF/fZ5Haw9xlqdVCo1yMMKrOH4ij1GF98h6+3C62odF2qd9QgUd3C7zJLGG3A2tukM+k+zZsPVz+jPrDsxJ/xS7mrcpGsw/JLxPXCNcfVz6VbwV92IOZ1OD8Saq4FL1xSLxV7xoO8C1xh4trkfLsBiK+tEyMMsRnlwtO5q4NI7Af0qmONU5WWzTlX7msBOR83wfVxzDerSOwWzbKHvG6IkuayhN2UjyYMgP1LHH1w3umzgnvVukslk+mWdXC5X4FqdQD2wSvuJj+P7UNcF0Vp5w8C3wZoNDBmYq13/LqH/sW3tOoH5ZNuCfNJ4ReV77LGBc1ZNvzLXGHmdixdXfUryQqEwZM7NsTcCxnE9MMUXeaO/EgNd4Pca8Q25R3tcwPuImGTdRvD/0D6Z9UL2eDwej8cj/AGAKMbLXKx5IwAAAABJRU5ErkJggg==>

[image8]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFEAAAAZCAYAAABJhMI3AAADiElEQVR4Xu1XSWhUQRCdxKhRXBCJ4Mxk1kjCiBsBjwouKCgI3sWTGC+uBxE9qHiXXMQFNCDRo0QQIwqCuKAI3sSbuMVoEjHGBExi9L1MtVZqfk9mJpKD/AdFd9erqq6u/7v7/0gkRIgQIUJMG5LJ5HHIT0oqldqiOYw7oD9XX1+fxbAqnU6vSiQSndCv1nYasL8I+Q75JfLD2miA71G2Q5Db8Xh8BdqvSk/5BumFDMh4GHbLbLxpBxIZgVxiv6GhYTb6YyhQreIfmoVQ2v9G8ANxHsD2Bn0spyEPinF7LYcHtp0cbA5aDvrP5PBgV1puykDgbVYXBNj1QXrcGIm2SlJrlc196A+hvQo54vSlgEVEUyNFaLU8gSIdbW5unllCEfdZDrsjKn5FH1JZSOa30QgmbLKcBezSnDyTySS03j5V2NxDU6V1pUKKyBjehTp9CUXcaznkvrBY7LLAhUL6s9nsEsv5APsnbvJcLjcLyW62NgRs7kamWES0LbLYpZrHeTYH8+5nv5IiQv+YHGw2Wq5UcJu8hLxhMpacDJI05ToSXI9ElkuyE7Yd9HcgB8ANo20TmxZt44MrIiFzvdJ8Mv+ANO8tIuQELzdeJHLp8CjiRei94LzA4b8Azp8gzzGstnypkMRYkFNOh4Qz1MVisbjTgb8JOanGtbSB7San80EXEfZv6ad5jD+qPvPxFhHtWbQb+NYh7lb0T4vPGevjBaofg8MgF2W5SiAJFJwlou+yeg2fr4UuIt8iKcYujnH2rkM/53iJ6S1iKmA7NzY2zhe/bssFAkGaYDyKoOctVwl8hbB63pyaJ6yND7qIhPiNSX8ggCuriITLxV6QRaHeyA7LlQMk9zSoELpATEzGt3w2xRBQxMviV4X2muEYs1gRA89hlwtkp+UmRV1d3Tw4fkDwZ5EKbk95swsKQR0Sv8K+OyPt+SdJj2pdEGwRCfEdipjzXPTFiljwnUiIX8E6ysUMBHkBeZ1SfxqlgItBkp1qzN8/e/hz/GfBmOOYLKroXNFodC7tEL9N65P538vxLa0w/kEO6Td6zrdbuMNaj7iLoBuWXHZobkpI5X+fvuB2XWw5H2D/TpJkQlycvfGrhePvIe1+cRcYmwmATTukW2K/Z06O45ulF53M/w93KVt+eTyCrHHzKeEDYC6DkD7EuYAQNS7WPwUS3WN1IUKECBEiRIgQIf47/AZnXWG5g3EnvAAAAABJRU5ErkJggg==>

[image9]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFcAAAAZCAYAAABEmrJwAAADO0lEQVR4Xu2YSWgUURCGJyZIRPEiYw6zvNlAHfAqgre5eFDMQQQ9KGr0IF5Ez+JZPIriclcUL/EmKHoQFBcERRER4xaSOJo4cUGTuPyVrtai8vr1dI+IyPugmPfqr6qurullkkzG4/F4PP8TPcaYKe10UalUish5DvsBe1Cr1RbrGEk+n68hboLjZ03HSKDvF7EzsCb738oasI+wd7CW8B3Q9f46aOKxbFTrUSB2I+yG2A9RfqlU6pdxNhDXgB2l+EKhsEHrIXF9sfbe4j/C2lmt/RFQeJ32uUD8ZNRJ2KDYYrG4SfvaqYGYBnK3crz1bsGX1Avb56rJ2pj2E6681KDgKdg0GluuNRcmxXB1PPZN9q+Qfo3h4aLH87pGCPRL9Gk7TghrI9pPuPISg0KXYa1qtbpUa+1gEg4Xg9kD2yx9yP9KNeKevYaHi2U3D+G4JWb2inQNibU5w0Xt9axd1VoS6CX0CPYCL4sFWkyCSThcG65BSMzv4VpzoK3B+ayM0kNYa+K5XaWXJfLq2F9g/0Ed3xZ0ZSB5DHYH23laT4PpcLjIPUb55XJ5mdY0JhjuNl7vojzccQWhT4o1DcraF2vjVI8Md9Ja2Basv8Nu6ngn+HZySPqEAhe11il0QlEnEUcul1tCuRjsKq3Z4EFsF3sa0tNwD+2c0qx9sTbnsUC48qzQSwoJM/jWT2itU0z64XZRnrzy4jDBlbZT7J+Fx8a5HcJHt9Aih8Ra1HDPsH5aa07EFTyotbSYlMOlnL6+voViP0DPQBmjMcFwB8I9zqNEdfCxQ/fAA7L2xdqo9hOodZhr3tdaW2Sz2UUoMIwCt7Dt0noSXMNF/V5oe7Ufvi/46FG+h3JvwwTP3N3KR4OiZ+WvoQu/tS/Won7nfiMdva/WWlLoJ8092BANQovtgNzPMSdBfzTUQx/WL0O/NplrAz0+QdxERtz+8J205UbVrNfr81lraQ2+u6xd11pHoMlBFB2nl4zWbCD2A2wE9optmPLlrY2a/fDdVnnUvNVknIR+SUB/A3ttgmPRuhHqWF8T6ynYKMeRUY90p9iOTVf8tAkuEPrfxZW4R1NH6NvO4/F4PB6Px+P5B/kJ6EtVsmJkufkAAAAASUVORK5CYII=>

[image10]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFgAAAAZCAYAAAC1ken9AAAD5UlEQVR4Xu1YO2hUURDdaATFT6HGQDbZuz9dxUZcUdCAoLGQFIJ2IpLGH4JgYyNYKVpoIfhD/HSCYKF2SmyMikpEtEgKBfETTIz5iTGJiYlnsnPfm5292V8EUd6B4b17zsy8ubP33XeTUChAgAABAvz3MMZ8g+3QfG1tbTISiTyDNgFr1roFtDOwn7Ae+NdrXaKqqmoe/Ho5p7UfsCvWB/dHtU58NBrdbzK1Wn4cNgDrgX1nri+VSs33n/iXgaL3cWFZDQa/kXgxXiXHFjzB42I8BN9T0scF+K3g5z7VGgH8L9h2zRPAn6ZYqsmhUc6J6urquVqbNpC4UXOFgJhuLiqrwTyBA4qjVeo1BKt1M/lJH6z6hZpzwfgNfuLQuurq6tZo3sJwgymHQ9vJWpvWygaSXYaNoiHLtZYPiOnnKxXkNTiRSCwhjq6+9+Qqvk+8HZtMw3OaSRyav0vzEtQcfu5jxX8lTXIahhsci8VSWkON2zhvp9ZKBpI0wwZ0I4oBGrAbxTTRPRfkNRjaMeI8Z5+/LnmOG5U+lkfu15qXMI4VjPt+WEz6uWDyNNjwHl1OTywqkaAN9h6v4xwtFgsqRNzTRGWDbxNnxxbgzkue47w8ih/SvIThBtNHlMf2I7Ve+2oYbjBit2ArScTj8WW4T4Mbgw3W1NQs1jEFkUwmFyC4C9aK4QytlwLKg0uFGNPEvAZj9T0kzo4Ff5Z4/LBhGnNcr/ZjPidewvgr+AVs2G5LheIIxv/INeG6Cc1twHUr7JrldcyUoMkgaBBBd7VWDpCrEQUdUhxNzGsw7m+4JgruHPOVPKa4yX1cgvlxzUsYv8ETdHQjDnUdYa5d+0uYPFsEuLWco0VrTtCHC85jePglrZUD43h1uaCCezC4q5LnuBHpI/g3mpcwfoMfKX6YeMx7neQlTJ4GEzgv1em9pQUhVvIdrZUC5GhR1soFtdOYfNDgDcTpD0U09xRhJ5IF4pDjouYlzBQNDmW+Mc68FsbfIpynJhtPR0atFQT/JdSB5M9DpfxCU4A+EFxQzjnYqIO+yXyIvD0X9xccjaggLp1Oz1J8FozjFCG0E6w5z7Imzzk4VMQPVCxmIslL2Ds0e7YWi4VdrbjuVfw98GOCmmwcnhUVnF2tK+2YfnjjOFloIKaeG/FWawTbJNhBrUX4uAhbLXms2KU2Dj5xqU0LtG0gaW84HF6ktXxATB+sA/YR9onGSn8FG4Td4qIbpE7APmh4Ug+gf6B82keCT0P0vwj53C+Yw03rYzJvymfWO2lMPHwO87Ok0Z/UIxzTjRpO+k/7w0DyPZoLECBAgAABAgQIEOAfw2/l5ocT874RrgAAAABJRU5ErkJggg==>

[image11]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFgAAAAZCAYAAAC1ken9AAADsklEQVR4Xu2YTWxMURTHp1RCfCxQTTptz3wxxEaMkNBEQi3EQmIpFjYSYmVjI7EiLFhIfEV87CQSC+xIbXwFIcKiJCTio9Gi1ZZqq9XxP+bcvtPT+6bTGYmQ90tO5r3/Ofe+e/9ze9+dxmIREREREf8z1UT0w4qO+vr6TGNj4wPU5BEtNu9A7ij3g+hEfZPNa2pqamahrkv6dPEdcdbV4HqfzbOeSCR24rpX6SOIHkQn4ptoX7LZ7OzgiX8BDOKFGmTe5hlMZq3O4X6Zr1YmeEDd96P2sK7xgbol8vz7NsdA/4nYYnUG+hFuy2Py5LjPfG1t7Uybqxh0vMlqxSBZDVZnZAK7jMardNQQrNb1tj1W/Vyr+aDA4HueXEdDQ8MKqztIDOY+PLmtkmu1ubJBZ2cQQzBksc0Vg0IMTqfTC1jnT62j/xu6ngqGj2vPGszfZnUNmyNG3DX6Z85pzUJicDKZzNocxrhZ+m23uUmDTloQPdaIUqEQg2HO/hD9gtZlIkO6xumY6DOra8izgnHdjUjqOh9UxGCSOZXrCcMvplbEG/w5zrDJyeAGY3UYecWnQzuhdTGoV9covd/qGhKD+SUq9+4ltdrWWkgMRtsN2ErSqVRqEa5z0IYRfXV1dfNtmwnJZDJz0LgD8Qi3U2y+HNgcHqjVsfpuhejHWMcXG+d7MaTL1ok+rr2GghX8GDHgtqWJ2jEUvOS243MdzG3G50bEeafbNqHwZNCoD42u2VylUIjB0C6G6MdFr5Z7NqTblDl9xOoaCgzO89GNNRi1V7Tntl5DRbYIaCulj9s254VfXCgexsNP21ylUIjBYXswtHNal4kM6hqlv7S6hgKD7xh9gHXMe5XWNVTEYEb65XFW2VwoaiVftblyoXCD17BuXxSeU4SbyBhYQx+nrK6hEINjhXeMt18HBVuE99Tk2vOR0eYmRH4JtaHzh7HJfEMeKMRgRgY55qBPhRfR6J6L65Oe9lWs5XK5aUYfA3lOESp3UHLesywVOQfHSviCSmUqOnmCeA2zp9tkKVDhJ6p3IFiB15EbVtJv4/CshNLcal3q7vmLJ8/JwoI2TWLEK5tjnEmI3TbnjouI5VrHil3o2qEmpXMVwdsGOu2Kx+PzbM4Har8iPiDeSbRxez7ymLqniD7EZRl0s84z2AdJJnUT+bfcl63RyGmI/xfBz+Rnv0d8xBwuuRoq/KW48bXzPeuo2SPP0sE/qQelzSeM4VDwtD8MOt9htYiIiIiIiIiIiIh/jF/6fn76w4ziSQAAAABJRU5ErkJggg==>