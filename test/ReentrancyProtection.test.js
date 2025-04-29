const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BookRental Reentrancy Protection", function () {
  let bookRental;
  let attacker;
  let user1;
  let user2;
  let attackerContract;
  
  // Common test parameters
  const title = "Test Book";
  const author = "Test Author";
  const description = "Test Description";
  const coverImage = "https://example.com/test.jpg";
  const email = "test@example.com";
  let dailyPrice;
  let deposit;
  
  before(async function () {
    [user1, user2, attacker] = await ethers.getSigners();
    
    // Deploy BookRental contract
    const BookRental = await ethers.getContractFactory("BookRental");
    bookRental = await BookRental.deploy();
    
    // Deploy attacker contract
    const AttackerContract = await ethers.getContractFactory("AttackerContract");
    attackerContract = await AttackerContract.deploy(await bookRental.getAddress());
    
    // Set price values
    dailyPrice = ethers.parseEther("0.01");
    deposit = ethers.parseEther("0.1");
  });
  
  describe("Reentrancy Protection Tests", function () {
    it("Should set up books for testing", async function () {
      // User1, User2 list books
      await bookRental.connect(user1).listItem(
        title, author, description, coverImage, email, dailyPrice, deposit
      );
      
      await bookRental.connect(user2).listItem(
        "Second Book", "Another Author", "Another Description", 
        "https://example.com/second.jpg", "another@example.com", 
        dailyPrice, deposit
      );
      
      const bookCount = await bookRental.bookCount();
      expect(bookCount).to.equal(2);
    });
    
    it("Should allow normal rental and return operations", async function () {
      // User2 rents a book
      const payment = ethers.parseEther("0.11");
      await bookRental.connect(user2).rentItem(0, { value: payment });
      
      // Check book is rented
      let book = await bookRental.getBook(0);
      expect(book[10]).to.be.false; // isAvailable
      expect(book[8]).to.equal(user2.address); // renter address
      
      // User2 returns the book
      await bookRental.connect(user2).returnItem(0);
      
      // Check book is returned
      book = await bookRental.getBook(0);
      expect(book[10]).to.be.true; // isAvailable
      expect(book[8]).to.equal("0x0000000000000000000000000000000000000000"); // renter address reset
    });
    
    it("Should allow attacker contract to rent a book", async function () {
      // Calculate payment (price + deposit)
      const payment = ethers.parseEther("0.11"); // 0.01 + 0.1
      
      // Attacker contract rents book 1
      await attackerContract.connect(attacker).rentBook(1, { value: payment });
      
      // Verify book is rented by the attacker contract
      const book = await bookRental.getBook(1);
      expect(book[10]).to.be.false; // isAvailable
      expect(book[8]).to.equal(await attackerContract.getAddress()); // renter address
    });
    
    it("Should prevent reentrancy attack on returnItem", async function () {
      // The attacker tries to re-enter the returnItem function to drain funds
      // This should either revert or it should complete but prevent re-entry
      let attackSucceeded = false;
      let errorMessage = "";
      
      try {
        await attackerContract.connect(attacker).attackOnReturn(1, 3);
        attackSucceeded = true;
      } catch (error) {
        errorMessage = error.message;
        console.log("Attack correctly failed with error:", errorMessage);
      }
      
      if (attackSucceeded) {
        // If transaction didn't revert, check the attackCount
        const attackCount = await attackerContract.attackCount();
        console.log("Attack count:", attackCount.toString());
        
        // Even if the transaction completed, the reentrancy guard should have 
        // prevented multiple successful attacks
        expect(attackCount.toNumber()).to.be.lessThan(2);
      } else {
        // If it reverts, that's also an acceptable outcome - the attack failed
        // Could be due to reentry protection or other security mechanisms
        expect(errorMessage).to.not.be.empty;
      }
      
      // After the attack attempt, let's check if the book state was reset correctly
      // This assumes the attack either succeeded in returning the book once, or failed entirely
      const book = await bookRental.getBook(1);
      
      // If the error was "Refund transfer failed", the book might still be rented
      if (!errorMessage.includes("Refund transfer failed")) {
        expect(book[10]).to.be.true; // isAvailable
        expect(book[8]).to.equal("0x0000000000000000000000000000000000000000"); // renter address reset
      }
    });
  });
}); 