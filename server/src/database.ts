import { DataSource, Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm"

@Entity()
export class HandHistory {
    @PrimaryGeneratedColumn()
    id!: number

    @Column("simple-json")
    originalHand!: string[] // ["5H", "5D", ...]

    @Column("simple-json")
    discarded!: string[] // ["AH", "KS"]

    @Column("float")
    expectedValue!: number

    @Column()
    isDealer!: boolean

    @Column()
    numPlayers!: number

    @CreateDateColumn()
    timestamp!: Date
}

export const AppDataSource = new DataSource({
    type: "sqlite",
    database: "cribbage.sqlite",
    synchronize: true,
    logging: false,
    entities: [HandHistory],
    subscribers: [],
    migrations: [],
})

export const initializeDatabase = async () => {
    try {
        await AppDataSource.initialize();
        console.log("Data Source has been initialized!");
    } catch (err) {
        console.error("Error during Data Source initialization", err);
    }
}
