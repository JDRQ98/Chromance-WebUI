# Main Landing Page Project Tasks

## Overview
Create a new main landing page that displays all profiles from the microcontroller and allows users to switch between them or edit them.

## Phase 1: Project Structure & Setup
- [x] Create new `index.html` as the main landing page
- [x] Create `landing.css` for landing page specific styles
- [x] Create `landing.js` for landing page functionality
- [x] Update project structure to have clear separation between landing and editor pages

## Phase 2: API Integration
- [x] Implement HTTP GET request to `hexagono.local/getCurrentProfiles`
- [x] Parse and handle profile data from microcontroller
- [x] Implement error handling for network requests
- [x] Add loading states and error messages

## Phase 3: Profile Visualization
- [x] Design scrollable profile grid layout
- [x] Create profile card component with:
  - Profile name
  - Visual representation of active nodes (hexagon grid)
  - Profile status (active/inactive)
  - Color preview
- [x] Implement responsive design for different screen sizes
- [x] Add hover effects and visual feedback

## Phase 4: Profile Management
- [x] Implement profile selection (POST to `hexagono.local`)
- [x] Add "Edit Profile" functionality that navigates to `ProfileEditor.html`
- [x] Implement profile switching with visual feedback
- [x] Add confirmation dialogs for critical actions

## Phase 5: Data Format Conversion
- [x] Create utility functions to convert between:
  - Microcontroller format (19-element ActiveNodes array)
  - Editor format (array of active node IDs)
- [x] Handle profile data transformation for editor compatibility
- [x] Implement reverse conversion for saving profiles

## Phase 6: Navigation & UX
- [x] Add navigation between landing page and profile editor
- [x] Implement URL parameters or localStorage for profile context
- [x] Add breadcrumb navigation
- [x] Implement back/forward browser navigation

## Phase 7: Profile Editor Integration
- [x] Modify `ProfileEditor.html` to accept profile data from landing page
- [x] Update profile editor to save to `hexagono.local/updateProfile`
- [x] Implement profile creation workflow
- [ ] Add profile deletion functionality

## Phase 8: Error Handling & Validation
- [x] Add network error handling
- [x] Implement profile data validation
- [x] Add user-friendly error messages
- [x] Implement retry mechanisms for failed requests
- [x] Add CORS error handling with helpful solutions
- [x] Implement demo mode for testing without microcontroller

## Phase 9: Testing & Polish
- [ ] Test all profile operations
- [ ] Verify data consistency between landing page and editor
- [ ] Test responsive design on different devices
- [ ] Add loading animations and transitions
- [ ] Performance optimization

## Phase 10: Documentation & Cleanup
- [ ] Update README with new landing page information
- [ ] Add code comments and documentation
- [ ] Clean up unused code
- [ ] Final testing and bug fixes

## Technical Notes
- Use modern JavaScript (ES6+) with async/await for API calls
- Implement proper error boundaries and fallback states
- Ensure accessibility compliance (ARIA labels, keyboard navigation)
- Use CSS Grid/Flexbox for responsive layouts
- Consider implementing a simple state management solution if complexity grows
