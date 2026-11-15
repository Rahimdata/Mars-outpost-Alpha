# Mars: Outpost Alpha

Mars: Outpost Alpha is a browser-based Mars survival and colony-management game. Guide a crew through a ten-Sol mission by exploring the surface, maintaining the outpost, managing supplies, and making decisions that shape the campaign outcome.

**Project demonstration:** https://drive.google.com/file/d/14tvYGSmDd0h8igktmRp5Y_gJ5MljuJuX/view?usp=sharing 

## About the game

Players explore Mars on foot and by rover, inspect and maintain colony systems, manage oxygen, water, food, power, and crew wellbeing, and complete mission objectives. The in-game science archive connects discoveries and mission tasks with learning resources about Mars.

The game is designed to introduce young learners to mission planning and engineering trade-offs through exploration, plain-language objectives, and resource decisions.

## NASA data 

The game uses NASA sources in three different ways:
- **Curiosity RAD:** The Sol 7 radiation-planning scenario refers to NASA’s historical average of about 210 micrograys per day measured during Curiosity’s first ten months on Mars. The game uses this to frame a shelter-or-EVA choice. The displayed measurement is historical, not a current forecast. The game’s crew-wellbeing effect is fictional; it is not a human-dose calculation or safety limit.
- **Mars communication delay:** NASA describes one-way communication latency between Earth and Mars as roughly 4–24 minutes, depending on the planets’ positions. The game uses a chosen 22-minute one-way scenario, so a request and reply take about 44 in-game minutes. It is a gameplay scenario, not a live connection or data feed.
- **Science archive and image:** The archive cites NASA science and mission resources. The title screen uses a NASA Astronomy Picture of the Day image.
Colony resource levels, weather timing, protection values, and crew-wellbeing effects are simplified game simulations. They are not live NASA measurements, operational forecasts, or medical guidance. The project is not affiliated with or endorsed by NASA.

## NASA resources
Radiation and communications
- Radiation Measurements on Mars — NASA Science
- MSL RAD Reduced Data Records — NASA Planetary Data System
- Space Communications: 7 Things You Need to Know — NASA
Science archive
- Mars: Facts — NASA Science
- Mars Fact Sheet — NASA NSSDC
- Evidence for Ancient Water on Mars — NASA Astrobiology
- Mars Odyssey Science Highlights — NASA
- Mars Phoenix Mission — NASA
- Mars Surface Power Generation Challenges and Considerations — NASA
- Humans to Mars — NASA
- MOXIE — NASA
- Curiosity Science Instruments — NASA Science
- Chemistry and Mineralogy Instrument — NASA
- Clay Minerals From Mars’ Most Ancient Past? — NASA Science
- Mars Science Objectives — NASA Science
-Title-screen image - McMurdo Panorama from Mars — NASA Astronomy Picture of the Day

## Built with
- React
- TypeScript
- Vite
- Three.js
- React Three Fiber
 
## Run locally
Requirements: Node.js and npm.

## Author 
Mohd Rahim

```bash
npm install
npm run dev
