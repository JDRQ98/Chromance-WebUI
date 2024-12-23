let selectedNodes = [];  // Array to store selected nodes

        // Border nodes (bi-nodes), quad nodes, and tri nodes
        const borderNodes = [0, 3, 5, 13, 15, 18];
        const triNodes = [4, 6, 7, 11, 12, 14];
        const quadNodes = [1, 2, 8, 10, 16, 17];

        // Function to highlight the selected node in green
        function highlightNode(node) {
            node.style.backgroundColor = 'green';
        }

        // Function to reset the node to its default color
        function resetNode(node) {
            node.style.backgroundColor = '#000';
        }

        // Function to update the modal with selected nodes
        function updateModal() {
            const selectedIds = selectedNodes.map(node => node.dataset.id);
            const display = document.getElementById('selectedNodesDisplay');
            if (selectedIds.length > 0) {
                display.textContent = 'Selected Nodes: ' + selectedIds.join(', ');
            } else {
                display.textContent = 'No nodes selected';
            }
        }

        // Function to open the modal window
        function openModal() {
            document.getElementById('modal').classList.add('show');
            updateModal();  // Update modal with selected nodes
        }

        // Function to close the modal window and deselect all nodes
        function closeModal() {
            selectedNodes.forEach(node => resetNode(node));
            selectedNodes = [];  // Clear the selected nodes
            document.getElementById('modal').classList.remove('show');
            updateModal();  // Update modal to reflect no nodes selected
        }

        // Function to handle node click and toggle selection
        function handleNodeClick(node) {
            if (selectedNodes.includes(node)) {
                // If node is already selected, deselect it
                resetNode(node);
                selectedNodes = selectedNodes.filter(n => n !== node);  // Remove from selected nodes
            } else {
                // If node is not selected, select it
                highlightNode(node);
                selectedNodes.push(node);  // Add to selected nodes
            }

            updateModal();  // Update modal with current selection

            if (selectedNodes.length > 0 && !document.getElementById('modal').classList.contains('show')) {
                openModal();  // Open the modal if there are selected nodes
            }
            
            if (selectedNodes.length == 0) {
                closeModal();  // close the modal if all nodes were de-selected
            }
        }

        // Function to select all nodes in a given category
        function selectNodes(nodes) {
            nodes.forEach(id => {
                const node = document.querySelector(`.hex[data-id="${id}"]`);
                handleNodeClick(node);
            });

            updateModal();  // Update modal with current selection

            if (selectedNodes.length > 0 && !document.getElementById('modal').classList.contains('show')) {
                openModal();  // Open the modal if nodes were selected
            }
        }

        // Event listeners for selecting node categories
        document.getElementById('selectBiNodes').addEventListener('click', () => selectNodes(borderNodes));
        document.getElementById('selectTriNodes').addEventListener('click', () => selectNodes(triNodes));
        document.getElementById('selectQuadNodes').addEventListener('click', () => selectNodes(quadNodes));

        // Close the modal when the close button is clicked
        document.getElementById('closeModal').addEventListener('click', closeModal);
