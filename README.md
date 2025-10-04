# Chromance Profile Manager

A web-based interface for managing lighting profiles for the Chromance LED system.

## Features

### Main Landing Page (`index.html`)
- **Profile Overview**: Displays all available profiles from the microcontroller
- **Visual Profile Cards**: Each profile shows:
  - Profile name and status (active/inactive)
  - Hexagon grid visualization of active nodes
  - Color preview swatches
- **Profile Management**:
  - Select profiles to activate them
  - Edit profiles to modify settings
  - Refresh to reload profiles from microcontroller
- **Responsive Design**: Works on desktop, tablet, and mobile devices

### Profile Editor (`ProfileEditor.html`)
- **Advanced Configuration**: Detailed settings for each profile
- **Node Management**: Visual hexagon grid for selecting active nodes
- **Effect Settings**: Configure ripple effects, colors, timing, and behavior
- **Real-time Preview**: See changes as you make them
- **Save & Apply**: Send configurations back to the microcontroller

## API Endpoints

The application communicates with the microcontroller at `http://hexagono.local`:

- `GET /getCurrentProfiles` - Retrieve all available profiles
- `POST /selectProfile` - Activate a specific profile
- `POST /UpdateProfile` - Save profile changes

## Data Format

### Microcontroller Format
```json
{
  "ProfileIndex": 0,
  "ProfileName": "My Profile",
  "Active": true,
  "ActiveNodes": [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "Behavior": 1,
  "Direction": 0,
  "RippleLifeSpan": 5000,
  "DelayBetweenRipples_ms": 1000,
  "RippleSpeed": 1.0,
  "RainbowDeltaPerTick": 100,
  "NumberOfColors": 3,
  "Colors": ["#FF0000", "#00FF00", "#0000FF"]
}
```

### Editor Format
The editor uses a more flexible format with separate global and node-specific settings, automatically converted from/to the microcontroller format.

## File Structure

```
├── index.html              # Main landing page
├── ProfileEditor.html      # Profile editor page
├── css/
│   ├── index.css          # Editor styles
│   └── landing.css        # Landing page styles
├── js/
│   ├── main.js            # Editor functionality
│   ├── landing.js         # Landing page functionality
│   ├── colorUtils.js      # Color manipulation utilities
│   ├── drawVisualizer.js  # Hexagon grid drawing
│   ├── effectsManager.js  # Effect management
│   ├── globalSettingsManager.js # Global settings
│   ├── modalManager.js    # Modal dialogs
│   └── nodeManager.js     # Node management
└── tasks.md               # Development tasks
```

## Usage

1. **Open the Landing Page**: Navigate to `index.html` in your browser
2. **View Profiles**: See all available profiles with visual previews
3. **Select Profile**: Click "Select" to activate a profile
4. **Edit Profile**: Click "Edit" to modify profile settings
5. **Save Changes**: Use "Apply Changes" to save modifications back to the microcontroller

## Browser Compatibility

- Modern browsers with ES6+ support
- Responsive design for mobile and desktop
- No external dependencies required

## Development

The project uses vanilla JavaScript with ES6 modules. All API communication is handled asynchronously with proper error handling and user feedback.
