<template>
  <div class="about">
    <!-- Nasus Avatar -->
    <div class="avatar-container">
      <img 
        src="@/assets/nasus.png" 
        alt="Nasus"
        class="avatar-image"
      >
    </div>
    
    <h1>Nasus</h1>
    <h3>a kódok őre</h3>
    <p>Nasus, a legendás bölcs kód reviewer, a tisztaság és minőség szigorú őre. Az ő páratlan szakértelme és éleslátása tette őt a kódok tudásának védelmezőjévé és egy fejlesztői csapat nélkülözhetetlen vezetőjévé. Nasus évtizedeken át irányította a projektfolyamatokat, biztosítva, hogy az általa felügyelt rendszerek stabilak, skálázhatók és fenntarthatók legyenek..</p>
    <p>Amikor egy kritikus projekt kudarcot vallott, Nasus visszavonult, hogy elkerülje a felesleges hibáztatást, és hagyta, hogy neve csupán a kódolók történeteiben éljen tovább. Most azonban, hogy egy új projekt felemelkedett, Nasus is visszatért. Eltökélte, hogy ezúttal a kódminőség soha többé nem fog kompromisszumot szenvedni, és az általa felépített alapok mindig az iparági szabványok fölött állnak majd.</p>
  </div>
</template>

<style lang="scss" scoped>
.avatar-container {
  display: flex;
  justify-content: center;
  margin: 2rem 0;
}

.avatar-image {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid var(--primary-color, #42b883);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
  }
}

@media (min-width: 1024px) {
  .about {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
}
</style>
