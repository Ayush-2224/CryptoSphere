// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./BookRental.sol";

contract AttackerContract {
    BookRental public bookRental;
    uint256 public bookId;
    uint256 public attackCount;
    uint256 public maxAttacks;
    
    event AttackAttempted(uint256 count, uint256 balance);
    
    constructor(address _bookRentalAddress) {
        bookRental = BookRental(_bookRentalAddress);
    }
    
    // Function to list a book in preparation for an attack
    function setupAttack(
        string memory _title, 
        string memory _author, 
        string memory _description, 
        string memory _coverImage,
        string memory _email,
        uint256 _dailyPrice,
        uint256 _deposit
    ) external {
        bookRental.listItem(
            _title,
            _author,
            _description,
            _coverImage,
            _email,
            _dailyPrice,
            _deposit
        );
    }
    
    // Function to rent a book (used by a victim)
    function rentBook(uint256 _bookId) external payable {
        bookRental.rentItem{value: msg.value}(_bookId);
    }
    
    // Attack function attempting reentrancy on return
    function attackOnReturn(uint256 _bookId, uint256 _maxAttacks) external payable {
        bookId = _bookId;
        maxAttacks = _maxAttacks;
        attackCount = 0;
        
        // Initial call to return the book
        bookRental.returnItem{value: msg.value}(_bookId);
    }
    
    // Fallback function for the attack
    receive() external payable {
        emit AttackAttempted(attackCount, address(this).balance);
        
        // Try to re-enter if we haven't reached max attack count
        if (attackCount < maxAttacks) {
            attackCount++;
            
            // Try to reenter the returnItem function
            if (msg.value > 0) {
                // This should fail due to reentrancy guard
                bookRental.returnItem{value: 0}(bookId);
            }
        }
    }
    
    // Withdraw funds to the attacker
    function withdraw() external {
        payable(msg.sender).transfer(address(this).balance);
    }
} 