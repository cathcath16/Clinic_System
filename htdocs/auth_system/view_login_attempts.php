    <?php
    require 'config.php';
    session_start(); 

    
    if (!isset($_SESSION['username'])) {
        header("Location: login.php");
        exit();
    }

    try {
        
        $stmt = $pdo->prepare("SELECT * FROM login_attempts");
        $stmt->execute();
        $loginAttempts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        echo "Error: " . $e->getMessage();
        exit;
    }

    
    $suspiciousIPs = [];
    if ($loginAttempts) {
        $ipCounts = [];
        foreach ($loginAttempts as $attempt) {
            if ($attempt['success'] == 0) { 
                $ip = $attempt['ip_address'];
                if (!isset($ipCounts[$ip])) {
                    $ipCounts[$ip] = 0;
                }
                $ipCounts[$ip]++;
            }
        }

        
        foreach ($ipCounts as $ip => $count) {
            if ($count > 2) { 
                $suspiciousIPs[] = $ip;
            }
        }
    }
    ?>

    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login Attempts</title>
        <style>
            body {
                background-image: url('https://static.vecteezy.com/system/resources/previews/006/115/516/non_2x/abstract-futuristic-circuit-board-illustration-high-computer-technology-dark-blue-color-background-hi-tech-digital-technology-concept-free-vector.jpg');
                background-size: cover; 
                background-position: center; 
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100vh; 
                margin: 0;
                font-family: Arial, sans-serif;
                color: white;
            }
            table {
                border-collapse: collapse;
                width: 80%;
                margin: 20px auto; 
                background-color: rgba(0, 0, 0, 0.7); 
                border-radius: 10px;
                overflow: hidden; 
            }
            th, td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: center;
            }
            th {
                background-color: #f2f2f2;
                color: black; 
            }
            .warning {
                color: red;
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 20px;
            }
            .logout-button {
                padding: 10px 15px;
                background-color: #f44336; 
                color: white; 
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                
            }
            .logout-button:hover {
                background-color: #d32f2f; 
            }
            .suspicious {
                background-color: rgba(255, 0, 0, 0.5); 
            }
        </style>
    </head>
    <body>

    
    <form action="delete_activity.php" method="POST" style="display: inline; position: absolute; top: 25px; left: 20px;" onsubmit="return confirm('Are you sure you want to delete all login attempts? This action cannot be undone.');">
        <button type="submit" class="logout-button">Delete All Login Attempts</button>
    </form>

    
    <form action="logout.php" method="POST" style="display: inline; position: absolute; top: 20px; right: 20px;">
        <button type="submit" class="logout-button">Logout</button>
    </form>

    <h2>Login Attempts</h2>

    <?php if (!empty($suspiciousIPs)): ?>
        <div class="warning">WARNING: Your system has detected suspicious activity from the following IP addresses:</div>
        <ul>
            <?php foreach ($suspiciousIPs as $ip): ?>
                <li><?php echo htmlspecialchars($ip); ?></li>
            <?php endforeach; ?>
        </ul>
    <?php endif; ?>

    <table>
        <tr>
            <th>ID</th>
            <th>Username</th>
            <th>IP Address</th>
            <th>Timestamp</th>
            <th>Success</th>
        </tr>
        <?php if ($loginAttempts): ?>
            <?php foreach ($loginAttempts as $attempt): ?>
                <tr class="<?php echo in_array($attempt['ip_address'], $suspiciousIPs) ? 'suspicious' : ''; ?>">
                    <td><?php echo htmlspecialchars($attempt['id']); ?></td>
                    <td><?php echo htmlspecialchars($attempt['username']); ?></td>
                    <td><?php echo htmlspecialchars($attempt['ip_address']); ?></td>
                    <td><?php echo htmlspecialchars($attempt['timestamp']); ?></td>
                    <td><?php echo $attempt['success'] ? 'Yes' : 'No'; ?></td>
                </tr>
            <?php endforeach; ?>
        <?php else: ?>
            <tr>
                <td colspan="5">No login attempts found.</td>
            </tr>
        <?php endif; ?>
    </table>

    </body>
    </html>