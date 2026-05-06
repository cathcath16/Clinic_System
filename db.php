<?php
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "clinic_db";

// Connect sa database
$conn = new mysqli($servername, $username, $password, $dbname);

// Check if naay error
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
?>