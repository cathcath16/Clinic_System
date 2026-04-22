<?php
require 'config.php';


function checkForThreats($pdo) {
    
    $stmt = $pdo->prepare("
        SELECT ip_address, COUNT(*) as attempt_count 
        FROM login_attempts 
        WHERE success = 0 
        GROUP BY ip_address 
        HAVING attempt_count > 5
    ");
    $stmt->execute();
    $failedAttempts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if ($failedAttempts) {
        echo "Suspicious activity detected:<br>";
        foreach ($failedAttempts as $attempt) {
            echo "IP Address: " . htmlspecialchars($attempt['ip_address']) . " - Failed Attempts: " . $attempt['attempt_count'] . "<br>";
        }
    } else {
        echo "No suspicious activity detected.";
    }
}


checkForThreats($pdo);
?>