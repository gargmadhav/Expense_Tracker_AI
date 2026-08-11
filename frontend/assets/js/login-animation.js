/* Interactive Coin-Collecting Cartoon Mascot Animation Engine */

(function () {
  'use strict';

  class CoinEngine {
    constructor(canvasId, mascotId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;

      this.ctx = this.canvas.getContext('2d');
      this.mascotEl = document.getElementById(mascotId);

      this.coins = [];
      this.particles = [];
      this.popups = [];
      this.symbols = ['₹', '$', '€', '£', '₹', '$'];
      this.colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#eab308', '#6366f1'];
      this.rewardTexts = ['+₹1,000', '+$500', '+₹5,000', '+$250', '+€150', '+$1,200', '+₹10,000'];

      this.score = 0;
      this.totalSavings = 0;

      this.mouseX = 0;
      this.mouseY = 0;
      this.mascotX = 0;
      this.mascotY = 0;
      this.targetMascotX = 0;

      this.initCanvas();
      this.bindEvents();
      this.spawnCoinsLoop();
      this.animate();
    }

    initCanvas() {
      const parent = this.canvas.parentElement;
      this.width = this.canvas.width = parent ? parent.offsetWidth : window.innerWidth * 0.5;
      this.height = this.canvas.height = parent ? parent.offsetHeight : window.innerHeight;

      this.mascotX = this.width * 0.5;
      this.mascotY = this.height * 0.65;
      this.targetMascotX = this.mascotX;
    }

    bindEvents() {
      window.addEventListener('resize', () => this.initCanvas());

      const heroSection = this.canvas.parentElement;
      if (heroSection) {
        heroSection.addEventListener('mousemove', (e) => {
          const rect = this.canvas.getBoundingClientRect();
          this.mouseX = e.clientX - rect.left;
          this.mouseY = e.clientY - rect.top;
          this.targetMascotX = Math.max(60, Math.min(this.width - 60, this.mouseX));
        });

        // Touch support for mobile
        heroSection.addEventListener('touchmove', (e) => {
          if (e.touches && e.touches[0]) {
            const rect = this.canvas.getBoundingClientRect();
            this.targetMascotX = Math.max(60, Math.min(this.width - 60, e.touches[0].clientX - rect.left));
          }
        }, { passive: true });
      }
    }

    spawnCoinsLoop() {
      setInterval(() => {
        if (this.coins.length < 18) {
          this.coins.push({
            x: Math.random() * (this.width - 80) + 40,
            y: -30,
            vy: Math.random() * 2.2 + 2.0,
            vx: (Math.random() - 0.5) * 0.8,
            radius: Math.random() * 6 + 18,
            symbol: this.symbols[Math.floor(Math.random() * this.symbols.length)],
            color: this.colors[Math.floor(Math.random() * this.colors.length)],
            angle: Math.random() * Math.PI * 2,
            vr: (Math.random() - 0.5) * 0.08,
            scaleY: 1
          });
        }
      }, 450);
    }

    createSparkles(x, y, color) {
      for (let i = 0; i < 14; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 1.5;
        this.particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          size: Math.random() * 4 + 2,
          color: color,
          alpha: 1,
          decay: Math.random() * 0.03 + 0.015
        });
      }
    }

    createPopup(x, y) {
      const text = this.rewardTexts[Math.floor(Math.random() * this.rewardTexts.length)];
      this.popups.push({
        x: x,
        y: y,
        text: text,
        alpha: 1,
        vy: -1.5,
        scale: 0.8
      });
    }

    update() {
      // Smooth lerp mascot movement towards cursor
      this.mascotX += (this.targetMascotX - this.mascotX) * 0.08;

      // Update mascot element position if DOM element exists
      if (this.mascotEl) {
        this.mascotEl.style.transform = `translate3d(${this.mascotX - 90}px, 0px, 0px)`;
      }

      const mascotCatchY = this.height * 0.68;
      const mascotRadius = 70;

      // Update coins
      for (let i = this.coins.length - 1; i >= 0; i--) {
        const coin = this.coins[i];
        coin.x += coin.vx;
        coin.y += coin.vy;
        coin.angle += coin.vr;
        coin.scaleY = Math.abs(Math.cos(coin.angle));

        // Check catch by mascot
        const dx = coin.x - this.mascotX;
        const dy = coin.y - mascotCatchY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mascotRadius) {
          // Mascot caught coin!
          this.createSparkles(coin.x, coin.y, coin.color);
          this.createPopup(coin.x, coin.y - 10);
          this.score += 1;
          this.totalSavings += Math.floor(Math.random() * 500) + 100;

          // Update DOM score badge if present
          const scoreEl = document.getElementById('mascotCoinScore');
          if (scoreEl) {
            scoreEl.textContent = `${this.score} Coins Collected!`;
          }

          this.coins.splice(i, 1);
          continue;
        }

        // Remove if off bottom
        if (coin.y > this.height + 40) {
          this.coins.splice(i, 1);
        }
      }

      // Update particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
        }
      }

      // Update popups
      for (let i = this.popups.length - 1; i >= 0; i--) {
        const pop = this.popups[i];
        pop.y += pop.vy;
        pop.scale = Math.min(1.2, pop.scale + 0.03);
        pop.alpha -= 0.02;
        if (pop.alpha <= 0) {
          this.popups.splice(i, 1);
        }
      }
    }

    draw() {
      this.ctx.clearRect(0, 0, this.width, this.height);

      // Draw Coins
      for (const coin of this.coins) {
        this.ctx.save();
        this.ctx.translate(coin.x, coin.y);

        // Glowing outer shadow
        this.ctx.shadowBlur = 12;
        this.ctx.shadowColor = coin.color;

        // Coin outer circle (with 3D spin scale effect)
        this.ctx.scale(1, Math.max(0.2, coin.scaleY));
        this.ctx.beginPath();
        this.ctx.arc(0, 0, coin.radius, 0, Math.PI * 2);

        // Radial gold gradient
        const grad = this.ctx.createRadialGradient(-5, -5, 2, 0, 0, coin.radius);
        grad.addColorStop(0, '#fef08a');
        grad.addColorStop(0.6, coin.color);
        grad.addColorStop(1, '#78350f');
        this.ctx.fillStyle = grad;
        this.ctx.fill();

        this.ctx.lineWidth = 2.5;
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.stroke();

        // Draw Currency Symbol
        if (coin.scaleY > 0.4) {
          this.ctx.shadowBlur = 0;
          this.ctx.fillStyle = '#ffffff';
          this.ctx.font = `bold ${Math.round(coin.radius * 1.1)}px 'Plus Jakarta Sans', sans-serif`;
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(coin.symbol, 0, 1);
        }

        this.ctx.restore();
      }

      // Draw Particles
      for (const p of this.particles) {
        this.ctx.save();
        this.ctx.globalAlpha = Math.max(0, p.alpha);
        this.ctx.shadowBlur = 8;
        this.ctx.shadowColor = p.color;
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      }

      // Draw Reward Popups
      for (const pop of this.popups) {
        this.ctx.save();
        this.ctx.globalAlpha = Math.max(0, pop.alpha);
        this.ctx.fillStyle = '#10b981';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#10b981';
        this.ctx.font = `800 ${Math.round(16 * pop.scale)}px 'Plus Jakarta Sans', sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(pop.text, pop.x, pop.y);
        this.ctx.restore();
      }
    }

    animate() {
      this.update();
      this.draw();
      requestAnimationFrame(() => this.animate());
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('coinCanvas')) {
      window.coinMascotEngine = new CoinEngine('coinCanvas', 'mascotCharacterWrapper');
    }
  });
})();
