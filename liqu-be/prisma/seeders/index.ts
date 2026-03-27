import { seedChains } from './chain.seeder.js';

(async () => {
  console.log('Start seeding...')

  //====================== PUT SEED DATA BELOW ======================//

  await seedChains()

  //====================== PUT SEED DATA ABOVE ======================//

  console.log('Seeding finished.')
})()
