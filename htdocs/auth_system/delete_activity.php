<?php
require 'config.php';
session_start(); // Start the session

// Check if the user is logged in; if not, redirect to login.php
if (!isset($_SESSION['username'])) {
    header("Location: login.php");
    exit();
}

try {
    
    $checkStmt = $pdo->prepare("SELECT * FROM login_attempts WHERE success = 0");
    $checkStmt->execute();
    $failedAttempts = $checkStmt->fetchAll(PDO::FETCH_ASSOC);
    
    
    echo "<pre>";
    print_r($failedAttempts);
    echo "</pre>";

    

    
    $stmt = $pdo->prepare("DELETE FROM login_attempts WHERE success = 0");
    $stmt->execute();

    
    header("Location: view_login_attempts.php?message=All failed login attempts deleted successfully.");
    exit();
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
    exit;
}
?>